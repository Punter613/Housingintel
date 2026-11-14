'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { compareListings } = require('../src/conflicts');
test('cross-source rent conflict retains both original claims', () => {
  const rows = [
    {source:'directory',sourceId:'1',rent:700,bedrooms:1},
    {source:'classified',sourceId:'2',rent:740,bedrooms:1}
  ];
  const found = compareListings(rows);
  assert.equal(found.length,1);
  assert.equal(found[0].field,'rent');
  assert.deepEqual(found[0].claims.map(x => x.value),[700,740]);
});
test('missing claims do not generate false conflicts', () => {
  assert.deepEqual(compareListings([{source:'a',rent:700},{source:'b'}]),[]);
});
