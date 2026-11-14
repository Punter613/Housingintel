'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {submitPublic,allowed}=require('../src/public-leads');
test('public lead is pending only, duplicate is harmless',async()=>{
 const input={source:'manual_other',source_url:'https://example.org/rental/1',address:'1 Sample Street',city:'Warren',zip:'44481',bedrooms:1,rent:650};
 const req={async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(input));}};
 let calls=0;
 const db={async query(sql,params){calls++;assert.doesNotMatch(sql,/INSERT INTO housing_listings/);if(params){assert.match(params[3],/UNVERIFIED/);return {rowCount:1};}return {rowCount:0};}};
 const result=await submitPublic(req,db,'test-ip-unique-1');
 assert.equal(result.accepted,true);assert.equal(result.duplicate,false);assert.equal(calls,2);
});
test('honeypot rejects obvious automated submissions',async()=>{
 const req={async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify({website:'spam'}));}};
 await assert.rejects(submitPublic(req,{},'test-ip-unique-2'),{status:400});
});
test('rate limit stops sixth suggestion in one hour',()=>{
 for(let i=0;i<5;i++)assert.equal(allowed('test-ip-unique-3',1000),true);
 assert.equal(allowed('test-ip-unique-3',1000),false);
 assert.equal(allowed('test-ip-unique-3',3601001),true);
});
