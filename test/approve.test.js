'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {approve}=require('../src/approve');
const id='a'.repeat(64);
const row={source:'tmha',sourceId:'youthbuild-2696',source_url:'https://trumbulltmha.org/youthbuild-property/',address:'2696 Wick St SE',city:'Warren',state:'OH',zip:'44484',bedrooms:1,rent:null};
function mock(status='PENDING_REVIEW',fail=false){
 const sql=[],params=[];
 const client={async query(q,p){sql.push(q);params.push(p);
  if(q.startsWith('SELECT payload'))return {rowCount:1,rows:[{payload:row,status}]};
  if(q.startsWith('INSERT INTO housing_listings')&&fail)throw Error('storage failed');
  if(q.startsWith('UPDATE housing_review_queue'))return {rowCount:1,rows:[{id,status:'APPROVED'}]};
  return {rowCount:1,rows:[]};
 },release(){}};
 return {sql,params,db:{async connect(){return client;}}};
}
test('approval publishes null rent and commits only after queue status update',async()=>{
 const m=mock();const result=await approve(m.db,id);
 assert.equal(result.status,'APPROVED');
 const i=m.sql.findIndex(q=>q.startsWith('INSERT INTO housing_listings'));
 assert.ok(i>0);assert.equal(m.params[i][8],null);
 assert.ok(m.sql.findIndex(q=>q.startsWith('UPDATE housing_review_queue'))>i);
 assert.equal(m.sql.at(-1),'COMMIT');
});
test('approval refuses previously decided review without publishing',async()=>{
 const m=mock('APPROVED');
 await assert.rejects(approve(m.db,id),{status:409});
 assert.equal(m.sql.includes('ROLLBACK'),true);
 assert.equal(m.sql.some(q=>q.startsWith('INSERT INTO housing_listings')),false);
});
test('approval rolls back on listing storage error',async()=>{
 const m=mock('PENDING_REVIEW',true);
 await assert.rejects(approve(m.db,id),/storage failed/);
 assert.equal(m.sql.at(-1),'ROLLBACK');
 assert.equal(m.sql.some(q=>q.startsWith('UPDATE housing_review_queue')),false);
});
test('approval rejects invalid IDs before opening transaction',async()=>{
 await assert.rejects(approve({connect(){throw Error('must not connect');}},'invalid'),{status:400});
});
