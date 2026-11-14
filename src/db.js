'use strict';
const { Pool } = require('pg');
const { publishListing } = require('./publish-listing');
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
  await db.query(`CREATE TABLE IF NOT EXISTS housing_identity_review (
    id TEXT PRIMARY KEY, listing_a TEXT NOT NULL, listing_b TEXT NOT NULL,
    reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    first_detected TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_detected TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ,
    CONSTRAINT housing_identity_review_status_check CHECK(status IN ('PENDING_REVIEW','CONFIRMED','DISMISSED')),
    CONSTRAINT housing_identity_review_pair_check CHECK(listing_a < listing_b)
  )`);
  await db.query('CREATE INDEX IF NOT EXISTS housing_identity_review_pending_idx ON housing_identity_review(status,last_detected DESC)');
  return true;
}
async function upsertListing(row) {
  const db = database();
  if (!db) throw new Error('DATABASE_URL required to store listings');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const identity=await publishListing(client,row);
    await client.query('COMMIT');
    return identity;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
module.exports = { database, initDb, upsertListing };
