'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {submitPublic,allowed}=require('../src/public-leads');

function request(data){
 return {async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(data));}};
}
function lead(url='https://example.org/rental/1'){
 return {source:'manual_other',source_url:url,address:'1 Sample Street',city:'Warren',zip:'44481',bedrooms:1,rent:650};
}
function recordingDb({failQueue=false}={}){
 const writes=[];
 const published=[{id:'existing-approved-listing',source:'tmha',address:'2696 Wick St SE'}];
 const queue=[];
 return {writes,published,queue,async query(sql,params){
  writes.push(sql);
  if(/(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?housing_listings\b/i.test(sql))
   throw Error('Publication boundary violated');
  if(sql.startsWith('CREATE TABLE'))return {rowCount:0};
  if(sql.startsWith('INSERT INTO housing_review_queue')){
   if(failQueue)throw Error('queue storage unavailable');
   assert.match(params[3],/UNVERIFIED/);
   if(queue.some(item=>item.id===params[0]))return {rowCount:0};
   queue.push({id:params[0],source:params[1],sourceId:params[2],payload:JSON.parse(params[3]),status:'PENDING_REVIEW'});
   return {rowCount:1};
  }
  throw Error('Unexpected SQL: '+sql);
 }};
}

test('public submission queues only: zero publication writes and pending review',async()=>{
 const db=recordingDb();
 const result=await submitPublic(request(lead()),db,'boundary-queue-only');
 assert.deepEqual(result,{accepted:true,duplicate:false});
 assert.equal(db.queue.length,1);
 assert.equal(db.queue[0].status,'PENDING_REVIEW');
 assert.equal(db.published.length,1);
 assert.equal(db.published[0].source,'tmha');
 assert.equal(db.writes.filter(sql=>/housing_listings\b/i.test(sql)).length,0);
 const duplicate=await submitPublic(request(lead()),db,'boundary-queue-only');
 assert.equal(duplicate.duplicate,true);
 assert.equal(db.queue.length,1);
 assert.equal(db.published.length,1);
});

test('queue insert failure rejects visibly with zero publication attempts and no partial state',async()=>{
 const db=recordingDb({failQueue:true});
 await assert.rejects(submitPublic(request(lead('https://example.org/rental/failure')),db,'boundary-queue-failure'),/queue storage unavailable/);
 assert.equal(db.queue.length,0);
 assert.equal(db.published.length,1);
 assert.equal(db.writes.filter(sql=>/housing_listings\b/i.test(sql)).length,0);
});

test('existing approved Wick Street listing survives public submission unchanged',async()=>{
 const db=recordingDb();
 const before=structuredClone(db.published);
 await submitPublic(request(lead('https://example.org/rental/preservation')),db,'boundary-preservation');
 assert.deepEqual(db.published,before);
 assert.equal(db.queue.length,1);
 assert.equal(db.writes.filter(sql=>/housing_listings\b/i.test(sql)).length,0);
});

test('honeypot rejects obvious automated submissions',async()=>{
 await assert.rejects(submitPublic(request({website:'spam'}),{},'boundary-honeypot'),{status:400});
});
test('rate limit stops sixth suggestion in one hour',()=>{
 for(let i=0;i<5;i++)assert.equal(allowed('boundary-rate-limit',1000),true);
 assert.equal(allowed('boundary-rate-limit',1000),false);
 assert.equal(allowed('boundary-rate-limit',3601001),true);
});
