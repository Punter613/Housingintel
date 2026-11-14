'use strict';
// One-time provenance repair. Dry-run by default. Does NOT rewrite historical raw intake.
const {database}=require('./db');
const {isDeepStrictEqual}=require('node:util');
const crypto=require('node:crypto');
const args=process.argv.slice(2);
function arg(name){const i=args.indexOf(name);return i<0?null:args[i+1];}
function assert(condition,message){if(!condition)throw Error(message);}
function diff(before,after){
 const keys=[...new Set([...Object.keys(before),...Object.keys(after)])].sort();
 return keys.filter(k=>!isDeepStrictEqual(before[k],after[k])).map(k=>({field:k,before:before[k],after:after[k]}));
}
async function run(){
 const id=arg('--id'),url=arg('--url'),commit=args.includes('--commit');
 assert(id&&url,'Usage: node src/correct-wick-source.js --id <existing-listing-id> --url <exact-source-url> [--commit]');
 assert(/^listing_[a-f0-9]{32}$/.test(id),'Invalid listing ID');
 const parsed=new URL(url);
 assert(parsed.protocol==='https:'||parsed.protocol==='http:','Source URL must be HTTP(S)');
 assert(/(^|\.)trumbulltmha\.org$/i.test(parsed.hostname),'Source URL must be official TMHA domain');
 assert(/youthbuild/i.test(parsed.pathname),'Source URL must identify YouthBuild');
 assert(process.env.DATABASE_URL,'DATABASE_URL required');
 const db=database(),client=await db.connect();
 try{
  await client.query('BEGIN');
  const found=await client.query('SELECT * FROM housing_listings WHERE id=$1 AND source=$2 AND source_url=$3 FOR UPDATE',[id,'manual_other',url]);
  assert(found.rowCount===1,'Expected exactly one matching manual_other listing with exact URL; got '+found.rowCount);
  const before=found.rows[0];
  // Snapshot includes raw JSON, timestamps and all other columns.
  console.log('BEFORE '+JSON.stringify(before));
  const count=await client.query('SELECT count(*)::int AS n FROM housing_listings');
  assert(count.rows[0].n===1,'Expected one production listing before correction');
  const updated=await client.query("UPDATE housing_listings SET source='tmha' WHERE id=$1 AND source=$2 AND source_url=$3 RETURNING *",[id,'manual_other',url]);
  assert(updated.rowCount===1,'Guarded update did not affect exactly one row');
  const after=updated.rows[0];
  console.log('AFTER '+JSON.stringify(after));
  const changes=diff(before,after);
  console.log('FIELD_DIFF '+JSON.stringify(changes));
  assert(changes.length===1&&changes[0].field==='source'&&changes[0].before==='manual_other'&&changes[0].after==='tmha','Unexpected changed fields; refusing commit');
  assert(isDeepStrictEqual(before.raw,after.raw),'Historical raw payload changed');
  const afterCount=await client.query('SELECT count(*)::int AS n FROM housing_listings');
  assert(afterCount.rows[0].n===1,'Listing count changed');
  if(commit){await client.query('COMMIT');console.log('COMMITTED: source only; raw preserved; listing count 1');}
  else{await client.query('ROLLBACK');console.log('DRY RUN: rolled back; no production change');}
 }catch(e){await client.query('ROLLBACK');throw e;}
 finally{client.release();await db.end();}
}
if(require.main===module)run().catch(e=>{console.error('CORRECTION FAILED:',e.message);process.exitCode=1;});
module.exports={diff};
