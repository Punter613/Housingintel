'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {queueCollected,pendingRow}=require('../src/collector-queue');
const row={source:'ohio_housing_locator',sourceId:'test-1',source_url:'https://example.org/listing/1',address:'100 Test Ave',city:'Warren',state:'OH',zip:'44481',rent:650,bedrooms:1,availability:'AVAILABLE',voucherAcceptance:'VERIFIED'};
test('collector forcibly marks availability and voucher acceptance unverified',()=>{
 const result=pendingRow(row);
 assert.equal(result.availability,'UNVERIFIED');
 assert.equal(result.voucherAcceptance,'UNVERIFIED');
 assert.equal(result.addressVerified,false);
});
test('collector queues only and never invokes a listing publisher',async()=>{
 const calls=[];
 const db={query:async(sql,args)=>{calls.push({sql,args});return {rowCount:1,rows:[{id:'queued',status:'PENDING_REVIEW'}]};}};
 const result=await queueCollected(db,row);
 assert.equal(result.status,'PENDING_REVIEW');
 assert.equal(calls.length,1);
 assert.match(calls[0].sql,/INSERT INTO housing_review_queue/);
 assert.doesNotMatch(calls[0].sql,/housing_listings|housing_properties/);
 const payload=JSON.parse(calls[0].args[3]);
 assert.equal(payload.availability,'UNVERIFIED');
 assert.equal(payload.voucherAcceptance,'UNVERIFIED');
});
test('re-collection updates pending payload idempotently using stable id',async()=>{
 const calls=[];const db={query:async(_sql,args)=>{calls.push(args);return {rowCount:1,rows:[{id:args[0],status:'PENDING_REVIEW'}]};}};
 await queueCollected(db,row);
 await queueCollected(db,{...row,rent:675});
 assert.equal(calls[0][0],calls[1][0]);
 assert.equal(JSON.parse(calls[1][3]).rent,675);
});
test('decided queue rows are locked with 409; no resurrection',async()=>{
 const db={query:async()=>({rowCount:0,rows:[]})};
 await assert.rejects(queueCollected(db,row),{status:409});
});
test('queue store fails closed without database',async()=>{
 await assert.rejects(queueCollected(null,row),/Database query required/);
});
