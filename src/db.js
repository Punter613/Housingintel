'use strict';
const { Pool } = require('pg');
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
  return true;
}
async function upsertListing(row) {
  const db = database();
  if (!db) throw new Error('DATABASE_URL required to store listings');
  await db.query(`INSERT INTO housing_listings
    (id, source, source_url, address, city, state, rent, bedrooms, raw)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      source_url=EXCLUDED.source_url, address=EXCLUDED.address,
      city=EXCLUDED.city, state=EXCLUDED.state, rent=EXCLUDED.rent,
      bedrooms=EXCLUDED.bedrooms, raw=EXCLUDED.raw, last_seen=now()`,
    [row.id,row.source,row.source_url||null,row.address||null,row.city||null,row.state||null,row.rent??null,row.bedrooms??null,JSON.stringify(row)]);
}
module.exports = { database, initDb, upsertListing };
