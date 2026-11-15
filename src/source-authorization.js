'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {URL}=require('node:url');
const FILE=path.join(__dirname,'..','config','source-authorizations.json');
function loadRecords(){return JSON.parse(fs.readFileSync(FILE,'utf8')).sources||[];}
function authorizeSource(item,records=loadRecords(),now=new Date()){
 const url=new URL(typeof item==='string'?item:item.url);
 const origin=url.origin;
 const matching=records.filter(r=>r.origin===origin);
 if(matching.length!==1)throw Error('SOURCE_AUTHORIZATION_MISSING');
 const r=matching[0];
 // Only the explicitly supported permission model is enforceable. Unknown
 // clauses (including frequency/delay quotas) must never be silently ignored.
 const allowedKeys=new Set(['origin','provider','determination','determinedAt','expiresAt','evidenceUrl','evidenceQuote','method','allowedPathPrefixes','sourceMaxPagesPerRun','configuredMaxPagesPerRun','conditions']);
 if(Object.keys(r).some(k=>!allowedKeys.has(k)))throw Error('SOURCE_AUTHORIZATION_UNSUPPORTED_FIELD');
 if(r.conditions!==undefined && (!Array.isArray(r.conditions)||r.conditions.length!==0))throw Error('SOURCE_AUTHORIZATION_UNSUPPORTED_CONDITION');
 if(r.determination==='PERMITTED_WITH_CONDITIONS')throw Error('SOURCE_AUTHORIZATION_CONDITIONS_UNSUPPORTED');
 if(!['PERMITTED','PERMITTED_WITH_CONDITIONS'].includes(r.determination))throw Error('SOURCE_AUTHORIZATION_DENIED');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(r.determinedAt||'')||!/^\d{4}-\d{2}-\d{2}$/.test(r.expiresAt||'')||!Number.isFinite(Date.parse(r.determinedAt))||!Number.isFinite(Date.parse(r.expiresAt))||Date.parse(r.determinedAt)>now.getTime()||Date.parse(r.expiresAt)<now.getTime())throw Error('SOURCE_AUTHORIZATION_EXPIRED');
 if(!r.evidenceUrl||!r.evidenceQuote||!r.provider)throw Error('SOURCE_AUTHORIZATION_EVIDENCE_MISSING');
 if(r.method!=='AUTOMATED_HTML_JSON_LD')throw Error('SOURCE_AUTHORIZATION_METHOD_MISMATCH');
 if(!Array.isArray(r.allowedPathPrefixes)||!r.allowedPathPrefixes.length||!r.allowedPathPrefixes.some(prefix=>typeof prefix==='string'&&prefix.startsWith('/')&&url.pathname.startsWith(prefix)))throw Error('SOURCE_AUTHORIZATION_SCOPE_MISMATCH');
 if(!Number.isInteger(r.sourceMaxPagesPerRun)||r.sourceMaxPagesPerRun<1||!Number.isInteger(r.configuredMaxPagesPerRun)||r.configuredMaxPagesPerRun<1||r.configuredMaxPagesPerRun>r.sourceMaxPagesPerRun)throw Error('SOURCE_AUTHORIZATION_RATE_MISMATCH');
 const configured=1+Math.min(12,Math.max(0,Number(typeof item==='object'?item.maxDetails??8:0)));
 if(configured>r.configuredMaxPagesPerRun)throw Error('SOURCE_AUTHORIZATION_RATE_MISMATCH');
 return r;
}
module.exports={loadRecords,authorizeSource};
