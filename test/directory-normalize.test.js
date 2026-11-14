'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {norm}=require('../src/directory-normalize');
test('OHFA normalization retains street abbreviation semantics',()=>{
 assert.equal(norm('2696 Wick Street SE'),'2696 WICK ST SE');
 assert.equal(norm('2696 Wick St SE'),'2696 WICK ST SE');
 assert.equal(norm('10 Main Avenue, #2'),'10 MAIN AVE 2');
});
test('directory candidate detector works regardless of module load order',()=>{
 for(const entry of ['../src/review-context','../src/publish-listing','../src/import-ohfa-directory']){
  require(entry);
 }
 const {crossSourceCandidateKey}=require('../src/cross-source-identity');
 assert.equal(crossSourceCandidateKey({address:'2696 Wick Street SE',city:'Warren',state:'OH',zip:'44484'}),
              crossSourceCandidateKey({address:'2696 Wick St SE',city:'Warren',state:'OH',zip:'44484'}));
});
