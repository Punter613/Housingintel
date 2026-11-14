'use strict';
const {initDb,upsertListing}=require('./db');
const {collectRentCast}=require('./sources/rentcast');
const fs=require('node:fs');
const path=require('node:path');
const {collectSources}=require('./sources/multi-page');
async function main(){
 if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
 await initDb();
 const config=JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','sources.json'),'utf8'));
 const sources=(config.pages||[]).filter(x=>x.enabled===true).slice(0,20);
 if(sources.length){
  const results=await collectSources(sources);
  console.log('[housingintel-scraper] multi-page report',JSON.stringify(results));
 }
 // GitHub scheduled jobs stay free: no paid API request without explicit opt-in.
 if(process.env.GITHUB_EVENT_NAME!=='workflow_dispatch' || !process.env.RENTCAST_API_KEY || process.env.RENTCAST_ALLOW_REQUESTS!=='YES'){
  console.log('[housingintel-scraper] storage ready; live API collection disabled pending authorized API key and opt-in');
  return {stored:0,reason:'no_authorized_api'};
 }
 const rows=await collectRentCast();
 let stored=0;
 for(const row of rows){await upsertListing(row);stored++;}
 console.log('[housingintel-scraper] RentCast stored '+stored+' source listings; voucher eligibility unverified');
 return {stored};
}
if(require.main===module) main().then(()=>process.exit(0)).catch(err=>{console.error('[housingintel-scraper]',err.message);process.exitCode=1;});
module.exports={main};
