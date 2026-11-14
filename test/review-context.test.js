'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {buildReviewContext,enrichQueue,FIELDS}=require('../src/review-context');
const lead={address:'2696 Wick Street SE',city:'Warren',state:'OH',zip:'44484',rent:771,availability:'UNVERIFIED',voucherAcceptance:'UNVERIFIED',eligibility:'UNVERIFIED',verificationStatus:'PENDING_REVIEW'};
const property={id:'ohfa_1',source:'ohfa',project_name:'Example',section_8_program:true,address:'2696 Wick St SE',city:'WARREN',state:'OH',zip:'44484'};
test('unique directory candidate preserves each independent rental evidence field',()=>{
 const original=structuredClone(lead);
 const result=buildReviewContext(lead,[property]);
 assert.equal(result.directoryContext.status,'DIRECTORY_ADDRESS_CANDIDATE');
 for(const field of FIELDS)assert.deepEqual(result.lead[field],original[field],field+' must not change');
 assert.deepEqual(lead,original);
 assert.equal(Object.hasOwn(lead,'directoryContext'),false);
 assert.equal(Object.hasOwn(result.lead,'section_8_program'),false);
});
test('ambiguous directory addresses attach no property context',()=>{
 const result=buildReviewContext(lead,[property,{...property,id:'ohfa_2'}]);
 assert.equal(result.directoryContext.status,'AMBIGUOUS_DIRECTORY_ADDRESS');
 assert.deepEqual(result.directoryContext.matches,[]);
});
test('completed lookup with no match is explicit',()=>{
 const result=buildReviewContext(lead,[]);
 assert.equal(result.directoryContext.status,'NO_DIRECTORY_MATCH');
 assert.deepEqual(result.directoryContext.matches,[]);
});
test('lookup failure differs from no match and does not mutate lead',async()=>{
 const original=structuredClone(lead);
 const rows=await enrichQueue({query:async()=>{throw Error('database unavailable');}},[{id:'q',payload:lead}]);
 assert.equal(rows[0].directoryContext.status,'LOOKUP_UNAVAILABLE');
 assert.deepEqual(rows[0].payload,original);
});

test('mutating matcher fails queue read loudly instead of returning LOOKUP_UNAVAILABLE',async()=>{
 const leadCopy=structuredClone(lead);
 const db={query:async()=>({rows:[property]})};
 const mutatingMatcher=(record,properties)=>{
   record.rent=0;
   return {status:'DIRECTORY_ADDRESS_CANDIDATE',matches:properties};
 };
 await assert.rejects(
   enrichQueue(db,[{id:'q',payload:leadCopy}],mutatingMatcher),
   /Directory lookup mutated rent/
 );
});
