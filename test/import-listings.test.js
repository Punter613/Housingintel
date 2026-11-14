'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseImport}=require('../src/import-listings');
const row={source:'ohio_housing_locator',sourceId:'example-123',source_url:'https://www.ohiohousinglocator.org/',address:'123 Example St',city:'Warren',state:'OH',zip:'44481',bedrooms:1,rent:700};
test('reviewed listing is unverified and never auto-merges',()=>{
 const [r]=parseImport(JSON.stringify([row]));
 assert.equal(r.addressVerified,false);
 assert.equal(r.voucherAcceptance,'UNVERIFIED');
 assert.equal(r.tenantUtilityAllowance,null);
});
test('requires source evidence and stable source id',()=>{
 assert.throws(()=>parseImport(JSON.stringify([{...row,source_url:''}])),/source_url/);
 assert.throws(()=>parseImport(JSON.stringify([{...row,sourceId:''}])),/sourceId/);
});
test('rejects duplicate source ids in same batch',()=>{
 assert.throws(()=>parseImport(JSON.stringify([row,row])),/Duplicate/);
});
test('rejects non-Ohio address and negative rent',()=>{
 assert.throws(()=>parseImport(JSON.stringify([{...row,state:'PA'}])),/Ohio/);
 assert.throws(()=>parseImport(JSON.stringify([{...row,rent:-1}])),/rent/);
});
