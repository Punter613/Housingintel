'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {diff}=require('../src/correct-wick-source');
test('provenance correction diff permits only source column change',()=>{
 const before={id:'listing_a',source:'manual_other',rent:null,first_seen:'2026-01-01',last_seen:'2026-01-02',raw:{source:'manual_other'},address:'2696 Wick St SE'};
 const after={...before,source:'tmha'};
 assert.deepEqual(diff(before,after),[{field:'source',before:'manual_other',after:'tmha'}]);
 assert.equal(after.raw.source,'manual_other');
});
test('provenance diff exposes unintended timestamp and raw changes',()=>{
 const before={source:'manual_other',last_seen:'original',raw:{source:'manual_other'}};
 const after={source:'tmha',last_seen:'modified',raw:{source:'tmha'}};
 assert.deepEqual(diff(before,after).map(x=>x.field),['last_seen','raw','source']);
});
