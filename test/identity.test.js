'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { identify } = require('../src/identity');
const base = { address:'2696 Wick St SE',city:'Warren',state:'OH',zip:'44484',addressVerified:true };
test('same verified property across sources yields one property and two listings', () => {
  const a = identify({...base,source:'directory',sourceId:'A'});
  const b = identify({...base,source:'classified',sourceId:'B'});
  assert.equal(a.propertyId,b.propertyId);
  assert.notEqual(a.listingId,b.listingId);
});
test('rescrape preserves both identifiers', () => {
  const a = identify({...base,source:'directory',sourceId:'A',rent:700});
  const b = identify({...base,source:'directory',sourceId:'A',rent:725});
  assert.deepEqual(a,b);
});
test('different apartment units never merge', () => {
  const a = identify({...base,source:'a',sourceId:'1',unit:'1',multiUnit:true});
  const b = identify({...base,source:'b',sourceId:'2',unit:'2',multiUnit:true});
  assert.notEqual(a.propertyId,b.propertyId);
});
test('missing unit in multiunit building requires review', () => {
  const a = identify({...base,source:'a',sourceId:'1',multiUnit:true});
  const b = identify({...base,source:'b',sourceId:'2',multiUnit:true});
  assert.notEqual(a.propertyId,b.propertyId);
  assert.equal(a.matchStatus,'NEEDS_REVIEW');
});
test('unverified address never automatically merges across sources', () => {
  const a = identify({...base,addressVerified:false,source:'a',sourceId:'1'});
  const b = identify({...base,addressVerified:false,source:'b',sourceId:'2'});
  assert.notEqual(a.propertyId,b.propertyId);
});
