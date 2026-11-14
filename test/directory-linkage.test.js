'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {candidateKey,matchDirectory}=require('../src/directory-linkage');
const lead={address:'11311 Shaker Boulevard',city:'Cleveland',state:'OH',zip:'44104'};
const property={id:'ohfa_1',source:'ohfa',address:'11311 Shaker Blvd',city:'CLEVELAND',state:'OH',zip:'44104',section_8_program:true,project_name:'Example'};
test('normalized address produces a directory candidate, not eligibility',()=>{
 const result=matchDirectory(lead,[property]);
 assert.equal(result.status,'DIRECTORY_ADDRESS_CANDIDATE');
 assert.deepEqual(Object.keys(result.matches[0]).sort(),['directoryId','projectName','section8Program','source']);
});
test('ambiguous duplicate directory matches do not auto-link',()=>{
 assert.equal(matchDirectory(lead,[property,{...property,id:'ohfa_2'}]).status,'AMBIGUOUS_DIRECTORY_ADDRESS');
});
test('different ZIP does not match',()=>{
 assert.equal(matchDirectory({...lead,zip:'44105'},[property]).status,'NO_DIRECTORY_MATCH');
});
test('missing ZIP and street ranges require review',()=>{
 assert.equal(candidateKey({...lead,zip:''}),null);
 assert.equal(candidateKey({...lead,address:'11113-11205 Woodland Avenue'}),null);
});
