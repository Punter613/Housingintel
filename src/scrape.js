'use strict';
const {initDb,upsertListing}=require('./db');
const {collectRentCast}=require('./sources/rentcast');
async function main(){
 if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
 await initDb();
 // GitHub scheduled jobs stay free: no paid API request without explicit opt-in.
 if(!process.env.RENTCAST_API_KEY || process.env.RENTCAST_ALLOW_REQUESTS!=='YES'){
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
