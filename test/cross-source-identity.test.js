'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {compareCrossSource,crossSourceCandidateKey}=require('../src/cross-source-identity');
const a={id:'wick',source:'tmha',source_url:'https://trumbulltmha.org/youthbuild-property/',address:'2696 Wick St SE',city:'Warren',state:'OH',zip:'44484'};
const b={...a,id:'other',source:'affordablehousing',source_url:'https://affordablehousing.com/other'};
test('different URL and named source at same complete address is candidate, never canonical merge',()=>{
 const result=compareCrossSource(b,[a]);
 assert.equal(result.status,'CROSS_SOURCE_CANDIDATE');
 assert.deepEqual(result.matches,[{listingId:'wick',source:'tmha'}]);
});
test('different ZIP does not match',()=>assert.equal(compareCrossSource({...b,zip:'44485'},[a]).status,'NO_CROSS_SOURCE_MATCH'));
test('explicit units and multi-unit ambiguity require review without candidate auto-link',()=>{
 assert.equal(crossSourceCandidateKey({...b,unit:'2L'}),null);
 assert.equal(crossSourceCandidateKey({...b,multiUnit:true}),null);
 assert.equal(compareCrossSource({...b,unit:'2L'},[a]).status,'NEEDS_REVIEW');
});
test('street ranges and incomplete addresses require review',()=>{
 assert.equal(compareCrossSource({...b,address:'2696-2698 Wick St SE'},[a]).status,'NEEDS_REVIEW');
 assert.equal(compareCrossSource({...b,zip:''},[a]).status,'NEEDS_REVIEW');
});
test('same source does not count as cross-source candidate',()=>{
 assert.equal(compareCrossSource({...b,source:'tmha'},[a]).status,'NO_CROSS_SOURCE_MATCH');
});
