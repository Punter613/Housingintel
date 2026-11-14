'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {publishListing}=require('../src/publish-listing');
const {approve}=require('../src/approve');
const {identify}=require('../src/identity');
const {submitPublic}=require('../src/public-leads');
const named={source:'tmha',sourceId:'youthbuild-2696',source_url:'https://trumbulltmha.org/youthbuild-property/',address:'2696 Wick St SE',city:'Warren',state:'OH',zip:'44484',unit:null,bedrooms:1,rent:null};
const weaker={...named,source:'manual_other'};
function clientDouble(existing=[]){
 const statements=[],published=[...existing],client={
 async query(sql,params){
  statements.push(sql);
  if(sql.startsWith('SELECT pg_advisory'))return {rowCount:1,rows:[]};
  if(sql.startsWith('SELECT id,source,address'))return {rowCount:published.length,rows:sql.includes('source_url=$1')?published.filter(x=>x.source_url===params[0]&&x.id!==params[1]):published.filter(x=>x.city.toLowerCase()===params[0].toLowerCase()&&x.state===params[1])};
  if(sql.startsWith('INSERT INTO housing_identity_review'))return {rowCount:1,rows:[]};
  if(sql.startsWith('SELECT payload,status'))return {rowCount:1,rows:[{payload:weaker,status:'PENDING_REVIEW'}]};
  if(sql.startsWith('INSERT INTO housing_properties'))return {rowCount:1,rows:[]};
  if(sql.startsWith('INSERT INTO housing_listings')){
   const current=published.find(x=>x.id===params[0]);
   if(!current)published.push({id:params[0],source:params[3],source_url:params[4],address:params[5],city:params[6],state:params[7],raw:JSON.parse(params[10])});
   return {rowCount:1,rows:[]};
  }
  if(sql.startsWith('UPDATE housing_review_queue'))return {rowCount:1,rows:[]};
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return {rowCount:0,rows:[]};
  throw Error('Unexpected SQL '+sql);
 },release(){}};
 return {client,statements,published};
}
function stored(row){return {id:identify(row).listingId,source:row.source,source_url:row.source_url,address:row.address,city:row.city,state:row.state,raw:row};}

test('shared publication preserves named source on same-ID upsert',async()=>{
 const db=clientDouble([stored(named)]),before=structuredClone(db.published);
 await publishListing(db.client,{...named,rent:700});
 assert.equal(db.published[0].source,'tmha');
 assert.equal(db.published.length,1);
 assert.equal(db.statements.filter(s=>s.startsWith('INSERT INTO housing_listings')).length,1);
 assert.deepEqual(db.published[0],before[0]);
});
test('import/collector publication rejects manual_other twin of named URL and unit',async()=>{
 const db=clientDouble([stored(named)]);
 await assert.rejects(publishListing(db.client,weaker),{status:409,code:'PROVENANCE_REVIEW_REQUIRED'});
 assert.equal(db.published.length,1);
 assert.equal(db.statements.some(s=>s.startsWith('INSERT INTO housing_listings')),false);
});
test('approval rejects manual_other twin and rolls back without deciding queue',async()=>{
 const db=clientDouble([stored(named)]);
 await assert.rejects(approve({async connect(){return db.client;}},'a'.repeat(64)),{status:409});
 assert.equal(db.statements.at(-1),'ROLLBACK');
 assert.equal(db.statements.some(s=>s.startsWith('UPDATE housing_review_queue')),false);
 assert.equal(db.published.length,1);
});
test('same URL at different apartment units is not automatically suppressed',async()=>{
 const unit1={...named,unit:'1A'},unit2={...weaker,unit:'2B'};
 const db=clientDouble([stored(unit1)]);
 await publishListing(db.client,unit2);
 assert.equal(db.published.length,2);
});
test('queue identity forks across source classification without changing published record',async()=>{
 const queue=new Map(),db={async query(sql,params){
  if(sql.startsWith('CREATE TABLE'))return {rowCount:0};
  if(sql.startsWith('INSERT INTO housing_review_queue')){
   const had=queue.has(params[0]);if(!had)queue.set(params[0],{source:params[1],payload:JSON.parse(params[3])});
   return {rowCount:had?0:1};
  }
  throw Error('Unexpected SQL '+sql);
 }};
 const input={source_url:'https://example.org/real-listing',address:'10 Test Ave',city:'Niles',zip:'44446',bedrooms:1,rent:575};
 const req=data=>({async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(data));}});
 await submitPublic(req({...input,source:'manual_other'}),db,'fork-test-a');
 await submitPublic(req({...input,source:'affordablehousing'}),db,'fork-test-b');
 assert.equal(queue.size,2);
 assert.deepEqual(new Set([...queue.values()].map(x=>x.source)),new Set(['manual_other','affordablehousing']));
});

test('provenance rejection writes neither listing nor identity review',async()=>{
 const db=clientDouble([stored(named)]);
 await assert.rejects(publishListing(db.client,weaker),{code:'PROVENANCE_REVIEW_REQUIRED'});
 assert.equal(db.statements.some(q=>q.startsWith('INSERT INTO housing_identity_review')),false);
 assert.equal(db.statements.some(q=>q.startsWith('INSERT INTO housing_listings')),false);
});
test('legitimate cross-source publication records candidate pair',async()=>{
 const db=clientDouble([stored(named)]);
 const other={...named,source:'affordablehousing',sourceId:'other',source_url:'https://example.org/other'};
 await publishListing(db.client,other);
 assert.equal(db.published.length,2);
 assert.equal(db.statements.filter(q=>q.startsWith('INSERT INTO housing_identity_review')).length,1);
});
test('identity review insert failure propagates so caller can roll back',async()=>{
 const base=clientDouble([stored(named)]);
 const original=base.client.query;
 base.client.query=async(q,p)=>{if(q.startsWith('INSERT INTO housing_identity_review'))throw Error('review storage failed');return original(q,p);};
 const other={...named,source:'affordablehousing',sourceId:'other',source_url:'https://example.org/other'};
 await assert.rejects(publishListing(base.client,other),/review storage failed/);
});

test('approval rolls back listing and queue decision when identity-review write fails',async()=>{
 const existing=stored(named),other={...named,source:'affordablehousing',sourceId:'other',source_url:'https://example.org/other'};
 const statements=[];
 const client={async query(sql,params){
  statements.push(sql);
  if(sql.startsWith('SELECT payload,status'))return {rowCount:1,rows:[{payload:other,status:'PENDING_REVIEW'}]};
  if(sql.startsWith('SELECT id,source,address'))return {rowCount:1,rows:sql.includes('source_url=$1')?[]:[existing]};
  if(sql.startsWith('INSERT INTO housing_identity_review'))throw Error('identity review storage failed');
  if(sql.startsWith('UPDATE housing_review_queue'))throw Error('queue should not be decided');
  return {rowCount:1,rows:[]};
 },release(){}};
 await assert.rejects(approve({connect:async()=>client},'b'.repeat(64)),/identity review storage failed/);
 assert.equal(statements.at(-1),'ROLLBACK');
 assert.equal(statements.includes('COMMIT'),false);
 assert.equal(statements.some(q=>q.startsWith('UPDATE housing_review_queue')),false);
});
