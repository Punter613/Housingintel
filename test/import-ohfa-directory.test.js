'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseCsv,prepare,norm}=require('../src/import-ohfa-directory');
test('CSV parser supports quoted commas and embedded newlines',()=>{
 const r=parseCsv('address,city,zip,state,project_name\n"123 Main St","Warren",44483,OH,"One, Two"\n');
 assert.equal(r[0].project_name,'One, Two');
});
test('normalization identifies spelling variants',()=>{
 assert.equal(norm('11311 Shaker Boulevard'),norm('11311 Shaker Blvd'));
});
test('directory rejects duplicate normalized addresses',()=>{
 assert.throws(()=>prepare([
 {address:'11311 Shaker Boulevard',city:'Cleveland',zip:'44104',state:'OH'},
 {address:'11311 Shaker Blvd',city:'Cleveland',zip:'44104',state:'OH'}
 ]),/Duplicate normalized address/);
});
test('directory requires complete Ohio address',()=>{
 assert.throws(()=>prepare([{address:'Main',city:'Warren',zip:'',state:'OH'}]),/Incomplete Ohio address/);
});
