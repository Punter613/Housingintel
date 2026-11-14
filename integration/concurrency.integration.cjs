'use strict';
// Real PostgreSQL concurrency proof. Run ONLY with an isolated test database.
const test=require('node:test');
const assert=require('node:assert/strict');
const {Pool}=require('pg');
const {initDb}=require('../src/db');
const {publishListing}=require('../src/publish-listing');
const {identify}=require('../src/identity');
const {pairId}=require('../src/identity-review');
if(!process.env.HOUSING_TEST_DATABASE_URL)throw Error('HOUSING_TEST_DATABASE_URL required; test cannot skip');
if(process.env.DATABASE_URL && process.env.HOUSING_TEST_DATABASE_URL===process.env.DATABASE_URL)throw Error('Refusing to test against application DATABASE_URL');
process.env.DATABASE_URL=process.env.HOUSING_TEST_DATABASE_URL;
const pool=new Pool({connectionString:process.env.HOUSING_TEST_DATABASE_URL,max:4});
const base={address:'100 Concurrency Test Ave',city:'Warren',state:'OH',zip:'44481',unit:null,multiUnit:false,addressVerified:false,bedrooms:1,rent:null,availability:'UNVERIFIED',voucherAcceptance:'UNVERIFIED'};
const a={...base,source:'tmha',sourceId:'concurrency-a',source_url:'https://example.org/test-a'};
const b={...base,source:'affordablehousing',sourceId:'concurrency-b',source_url:'https://example.org/test-b'};
async function runPair(first,second){
 const clients=await Promise.all([pool.connect(),pool.connect()]);
 let release;const barrier=new Promise(resolve=>{release=resolve;});
 let ready=0;
 async function publish(client,row){
  await client.query('BEGIN');
  try{
   await client.query("SET LOCAL lock_timeout = '8000ms'");
   await client.query("SET LOCAL statement_timeout = '15000ms'");
   ready++;if(ready===2)release();
   await barrier;
   await publishListing(client,row);
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}
 }
 try{
  await Promise.all([publish(clients[0],first),publish(clients[1],second)]);
  const ids=[identify(a).listingId,identify(b).listingId].sort();
  const rows=await pool.query('SELECT id,listing_a,listing_b,status FROM housing_identity_review');
  assert.equal(rows.rowCount,1,'exactly one durable identity review');
  assert.equal(rows.rows[0].id,pairId(...ids));
  assert.deepEqual([rows.rows[0].listing_a,rows.rows[0].listing_b],ids);
  assert.equal(rows.rows[0].status,'PENDING_REVIEW');
  const listings=await pool.query('SELECT id FROM housing_listings');
  assert.equal(listings.rowCount,2);
 }finally{clients.forEach(c=>c.release());}
}
test('real PostgreSQL: concurrent publications in both arrival orders create one review, no deadlocks', {timeout:45000},async()=>{
 try{
  await initDb();
  for(const order of [[a,b],[b,a]]){
   await pool.query('TRUNCATE housing_identity_review,housing_listings,housing_properties');
   await runPair(...order);
  }
 }finally{await pool.end();}
});
