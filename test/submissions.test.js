'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {authorized,submit}=require('../src/submissions');
const secret='0123456789abcdef0123456789abcdef';
test('rejects missing, short, malformed and incorrect tokens',()=>{
 assert.equal(authorized('Bearer '+secret,secret),true);
 assert.equal(authorized('Bearer '+secret,'short'),false);
 assert.equal(authorized('Bearer wrong',secret),false);
 assert.equal(authorized(undefined,secret),false);
});
test('valid submission queues pending without publishing',async()=>{
 const row={source:'tmha',sourceId:'test-only',source_url:'https://trumbulltmha.org/youthbuild-property/',address:'123 Example St',city:'Warren',state:'OH',zip:'44481',bedrooms:1,rent:null};
 const payload=JSON.stringify([row]);
 const req={async *[Symbol.asyncIterator](){yield Buffer.from(payload);}};
 let sql='';
 const db={async query(query,values){
  if(/CREATE TABLE/.test(query)){assert.equal(values,undefined);return {rowCount:0};}
  sql=query;
  assert.match(query,/INSERT INTO housing_review_queue/);
  assert.equal(JSON.parse(values[3]).availability,'UNVERIFIED');
  return {rowCount:1,rows:[{id:'abc',status:'PENDING_REVIEW'}]};
 }};
 const result=await submit(req,db);
 assert.equal(result.status,'PENDING_REVIEW');
 assert.match(sql,/housing_review_queue/);
 assert.doesNotMatch(sql,/housing_listings/);
});
