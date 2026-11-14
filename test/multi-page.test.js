'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {extract,sourceFor,collectSources,discoverLinks,allowedByRobots,robotsRules}=require('../src/sources/multi-page');
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

test('discovers only matching same-origin detail links',()=>{
 const html='<a href="/rentals/101">One</a><a href="https://other.example/rentals/102">Outside</a><a href="/about">About</a>';
 assert.deepEqual(discoverLinks(html,'https://example.org/search','/rentals/',10),['https://example.org/rentals/101']);
});
test('collects structured detail pages from a listing index',async()=>{
 const index='https://example.org/search',detail='https://example.org/rentals/101';
 const saved=[];
 const report=await collectSources([{url:index,detailPathContains:'/rentals/',maxDetails:3}],{
  robots:async()=>true,
  fetcher:async u=>u===index?'<a href="/rentals/101">View rental</a>':html,
  store:async row=>saved.push(row)
 });
 assert.equal(report[0].pages,2);assert.equal(saved.length,1);
});

test('attributes known site names and marks automatic collection',()=>{
 assert.equal(sourceFor('https://www.zillow.com/homedetails/123'),'zillow');
 assert.equal(sourceFor('https://www.apartments.com/abc'),'apartments');
 assert.equal(sourceFor('https://www.affordablehousing.com/oh/warren'),'affordablehousing');
 assert.equal(sourceFor('https://example.org/listing'),'manual_other');
 const rows=extract(html,'https://www.zillow.com/homedetails/example');
 assert.equal(rows[0].source,'zillow');
 assert.equal(rows[0].importMethod,'AUTOMATED_JSON_LD');
});
