'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseYouthBuild}=require('../src/sources/tmha-youthbuild');
const html=`<p>Housing Choice Vouchers accepted</p>
<h2>2696 Wick St. SE</h2><p>Warren, Ohio 44484</p>
<p>Property Manager:</p><p>Tyler Wohlford</p><p>Office address:</p>
<p>Phone: (330) 369-3333</p><p>1 Bedroom – 1 Bathroom</p>
<h2>941 East Ave. SE</h2><p>Warren, Ohio 44484</p><p>2 Bedrooms – 1 Bathroom</p>`;
test('TMHA public directory preserves missing vacancy and rent',()=>{
 const rows=parseYouthBuild(html);
 assert.equal(rows.length,2);
 assert.equal(rows[0].bedrooms,1);
 assert.equal(rows[0].rent,null);
 assert.equal(rows[0].availability,null);
 assert.equal(rows[0].voucherProgramAcceptance,'PUBLISHED_PROGRAM_LEVEL');
});
test('unexpected page format fails instead of silently collecting zero',()=>{
 assert.throws(()=>parseYouthBuild('<p>Housing Choice Vouchers accepted</p>'),/No TMHA/);
});
