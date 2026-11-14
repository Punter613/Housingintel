'use strict';
const fs=require('node:fs');
const {initDb,upsertListing,database}=require('./db');
const {identify}=require('./identity');
const ALLOWED=new Set(['ohio_housing_locator','affordablehousing','tmha','zillow','apartments','manual_other']);
function validate(raw,index){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Row '+index+': object required');
 const source=String(raw.source||'').trim();
 if(!ALLOWED.has(source))throw Error('Row '+index+': unsupported source');
 const sourceId=String(raw.sourceId||'').trim();
 if(!sourceId || sourceId.length>200)throw Error('Row '+index+': sourceId required (max 200)');
 const source_url=String(raw.source_url||'').trim();
 let url;
 try{url=new URL(source_url);if(!['http:','https:'].includes(url.protocol))throw Error('invalid');}
 catch{throw Error('Row '+index+': http(s) source_url required');}
 const address=String(raw.address||'').trim(),city=String(raw.city||'').trim(),state=String(raw.state||'OH').toUpperCase().trim(),zip=String(raw.zip||'').trim();
 if(!address||!city||state!=='OH'||!/^[0-9]{5}$/.test(zip))throw Error('Row '+index+': complete Ohio address and ZIP required');
 const bedrooms=raw.bedrooms===null||raw.bedrooms===undefined?null:Number(raw.bedrooms);
 const rent=raw.rent===null||raw.rent===undefined?null:Number(raw.rent);
 if(bedrooms!==null&&(!Number.isFinite(bedrooms)||bedrooms<0||bedrooms>20))throw Error('Row '+index+': invalid bedrooms');
 if(rent!==null&&(!Number.isFinite(rent)||rent<0||rent>100000))throw Error('Row '+index+': invalid rent');
 const row={source,sourceId,source_url:url.toString(),address,city,state,zip,unit:raw.unit||null,
   multiUnit:raw.multiUnit===true,addressVerified:false,bedrooms,rent,
   availability:raw.availability||'UNVERIFIED',voucherAcceptance:'UNVERIFIED',
   tenantUtilityAllowance:null,importMethod:raw.importMethod==='AUTOMATED_JSON_LD'?'AUTOMATED_JSON_LD':'MANUAL_REVIEW',evidenceNotes:raw.evidenceNotes||null,
   capturedAt:raw.capturedAt||null,sourceClaims:raw.sourceClaims||null};
 identify(row);
 return row;
}
function parseImport(json){
 const rows=JSON.parse(json);
 if(!Array.isArray(rows)||rows.length<1||rows.length>100)throw Error('Import must contain 1–100 records');
 const validated=rows.map(validate);
 const ids=new Set();
 for(const r of validated){const id=identify(r).listingId;if(ids.has(id))throw Error('Duplicate source/sourceId in batch');ids.add(id);}
 return validated;
}
async function main(){
 const path=process.argv[2];
 if(!path)throw Error('Usage: node src/import-listings.js path/to/reviewed.json [--commit]');
 const rows=parseImport(fs.readFileSync(path,'utf8'));
 if(!process.argv.includes('--commit')){
  console.log('VALIDATED '+rows.length+' records; dry run only. Add --commit to write.');
  return;
 }
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required for --commit');
 await initDb();
 try{
  for(const row of rows)await upsertListing(row);
  console.log('IMPORTED '+rows.length+' reviewed source records; no voucher eligibility verified');
 }finally{await database().end();}
}
if(require.main===module)main().catch(e=>{console.error('[housingintel-import]',e.message);process.exitCode=1;});
module.exports={validate,parseImport};
