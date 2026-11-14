'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {extract,collectSources,allowedByRobots,robotsRules}=require('../src/sources/multi-page');
const url='https://example.org/rentals/one';
const html='<script type="application/ld+json">'+JSON.stringify({'@type':'Apartment',address:{streetAddress:'100 Test Ave',addressLocality:'Warren',addressRegion:'OH',postalCode:'44481'},numberOfBedrooms:1,offers:{price:650}})+'</script>';
test('extracts structured Ohio rental without claiming voucher eligibility',()=>{
 const rows=extract(html,url);assert.equal(rows.length,1);assert.equal(rows[0].rent,650);assert.equal(rows[0].voucherAcceptance,'UNVERIFIED');assert.equal(rows[0].tenantUtilityAllowance,null);
});
test('respects robots disallow',()=>{
 assert.equal(allowedByRobots(robotsRules('User-agent: *\nDisallow: /rentals'),'/rentals/one'),false);
});
test('collects multiple URLs and reports blocked source',async()=>{
 let stored=0;const result=await collectSources([url,'https://example.org/blocked'],{robots:async u=>!u.endsWith('/blocked'),fetcher:async()=>html,store:async()=>{stored++;}});
 assert.equal(stored,1);assert.equal(result[1].status,'robots_blocked');
});
