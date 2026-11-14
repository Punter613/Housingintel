'use strict';
const { initDb } = require('./db');
/**
 * Batch scraper entrypoint for Render cron.
 * Sources must be explicitly registered and permitted before ingestion.
 * This initial safe run only verifies storage and exits; it never invents listings.
 */
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  await initDb();
  console.log('[housingintel-scraper] database initialized; no live source adapters enabled yet');
}
if (require.main === module) {
  main().then(() => process.exit(0)).catch(err => {
    console.error('[housingintel-scraper]', err.message);
    process.exitCode = 1;
  });
}
module.exports = { main };
