'use strict';
const { Pool } = require('pg');
const { identify } = require('./identity');
let pool;
function database() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 5000 });
  return pool;
}
async function initDb() {
  const db = database();
  if (!db) return false;
  await db.query(`CREATE TABLE IF NOT EXISTS housing_listings (
    id TEXT PRIMARY KEY, source TEXT NOT NULL, source_url TEXT,
    address TEXT, city TEXT, state TEXT, rent NUMERIC,
    bedrooms NUMERIC, raw JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS housing_properties (
    id TEXT PRIMARY KEY, match_status TEXT NOT NULL,
    address TEXT, unit TEXT, city TEXT, state TEXT, zip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await db.query('ALTER TABLE housing_listings ADD COLUMN IF NOT EXISTS property_id TEXT');
  await db.query('ALTER TABLE housing_listings ADD COLUMN IF NOT EXISTS source_id TEXT');
  await db.query('CREATE INDEX IF NOT EXISTS housing_listings_property_idx ON housing_listings(property_id)');
  await db.query(`CREATE TABLE IF NOT EXISTS housing_review_queue (
    id TEXT PRIMARY KEY, source TEXT NOT NULL, source_id TEXT NOT NULL,
    payload JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT housing_review_status_check CHECK(status IN ('PENDING_REVIEW','APPROVED','REJECTED'))
  )`);
  return true;
}
async function upsertListing(row) {
  const db = database();
  if (!db) throw new Error('DATABASE_URL required to store listings');
  const identity = identify(row);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO housing_properties (id,match_status,address,unit,city,state,zip)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (id) DO UPDATE SET updated_at=now()`,
      [identity.propertyId,identity.matchStatus,row.address||null,row.unit||null,row.city||null,row.state||null,row.zip||null]);
    await client.query(`INSERT INTO housing_listings
      (id, property_id, source_id, source, source_url, address, city, state, rent, bedrooms, raw)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        property_id=EXCLUDED.property_id, source_url=EXCLUDED.source_url,
        address=EXCLUDED.address, city=EXCLUDED.city, state=EXCLUDED.state,
        rent=EXCLUDED.rent, bedrooms=EXCLUDED.bedrooms, raw=EXCLUDED.raw,
        last_seen=now()`,
      [identity.listingId,identity.propertyId,String(row.sourceId),row.source,row.source_url||null,row.address||null,row.city||null,row.state||null,row.rent??null,row.bedrooms??null,JSON.stringify(row)]);
    await client.query('COMMIT');
    return identity;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
module.exports = { database, initDb, upsertListing };
