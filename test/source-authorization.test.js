'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {authorizeSource}=require('../src/source-authorization');
const item={url:'https://example.org/rentals',maxDetails:1};
const permitted={origin:'https://example.org',provider:'Example',determination:'PERMITTED',determinedAt:'2026-11-01',expiresAt:'2026-12-01',evidenceUrl:'https://example.org/terms',evidenceQuote:'Automated indexing permitted',method:'AUTOMATED_HTML_JSON_LD',allowedPathPrefixes:['/rentals'],sourceMaxPagesPerRun:3,configuredMaxPagesPerRun:2};
const now=new Date('2026-11-14T12:00:00Z');
test('source authorization fails closed without affirmative record',()=>{
 assert.throws(()=>authorizeSource(item,[],now),/SOURCE_AUTHORIZATION_MISSING/);
 assert.throws(()=>authorizeSource(item,[{...permitted,determination:'MANUAL_ONLY'}],now),/SOURCE_AUTHORIZATION_DENIED/);
 assert.throws(()=>authorizeSource(item,[{...permitted,expiresAt:'2026-11-01'}],now),/SOURCE_AUTHORIZATION_EXPIRED/);
});
test('authorization requires matching scope, method, evidence and stated/configured limits',()=>{
 assert.equal(authorizeSource(item,[permitted],now).provider,'Example');
 for(const change of [{method:'EMAIL_ALERT'},{allowedPathPrefixes:['/other']},{evidenceQuote:''},{sourceMaxPagesPerRun:1},{configuredMaxPagesPerRun:1}]){
  assert.throws(()=>authorizeSource(item,[{...permitted,...change}],now));
 }
});
test('collector makes no network requests without permission',async()=>{
 const {collectSources}=require('../src/sources/multi-page');
 let calls=0;
 const result=await collectSources([item],{fetcher:async()=>{calls++;return '';},robots:async()=>{calls++;return true;},store:async()=>{calls++;}});
 assert.equal(calls,0);assert.equal(result[0].status,'error');assert.match(result[0].error,/SOURCE_AUTHORIZATION_MISSING/);
});

test('rejects conditional permissions and unrecognized frequency restrictions',()=>{
 assert.throws(()=>authorizeSource(item,[{...permitted,determination:'PERMITTED_WITH_CONDITIONS'}],now),/CONDITIONS_UNSUPPORTED/);
 assert.throws(()=>authorizeSource(item,[{...permitted,conditions:[{minDelaySeconds:60}]}],now),/UNSUPPORTED_CONDITION/);
 assert.throws(()=>authorizeSource(item,[{...permitted,requestsPerDay:10}],now),/UNSUPPORTED_FIELD/);
});
