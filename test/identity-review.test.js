'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {pairId,recordCandidate,decideIdentity}=require('../src/identity-review');
test('pair identity is arrival-order invariant',()=>{
 assert.equal(pairId('listing_A','listing_B'),pairId('listing_B','listing_A'));
 assert.notEqual(pairId('listing_A','listing_B'),pairId('listing_A','listing_C'));
});
test('re-detection refreshes timestamp but cannot reset decided status',async()=>{
 const rows=new Map(),calls=[];
 const client={query:async(sql,params)=>{
  calls.push(sql);
  if(sql.startsWith('INSERT INTO housing_identity_review')){
   const prior=rows.get(params[0]);if(prior)prior.detected++;else rows.set(params[0],{status:'PENDING_REVIEW',detected:1});
   return {rowCount:1,rows:[]};
  }
  if(sql.startsWith('UPDATE housing_identity_review')){
   const row=rows.get(params[0]);if(!row||row.status!=='PENDING_REVIEW')return {rowCount:0,rows:[]};
   row.status=params[1];return {rowCount:1,rows:[{id:params[0],status:row.status}]};
  }
  throw Error('Unexpected SQL');
 }};
 const id=await recordCandidate(client,'B','A');
 await decideIdentity(client,id,'DISMISSED');
 await recordCandidate(client,'A','B');
 assert.equal(rows.size,1);
 assert.equal(rows.get(id).status,'DISMISSED');
 assert.equal(rows.get(id).detected,2);
 assert.ok(calls[0].includes('ON CONFLICT(id) DO UPDATE SET last_detected=now()'));
 await assert.rejects(decideIdentity(client,id,'CONFIRMED'),{status:409});
});
