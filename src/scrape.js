'use strict';
const { initDb, upsertListing } = require('./db');
const { collectYouthBuild } = require('./sources/tmha-youthbuild');
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  await initDb();
  const rows = await collectYouthBuild();
  let stored = 0;
  for (const row of rows) {
    const result = await upsertListing(row);
    stored++;
    console.log('[housingintel-scraper] stored',result.listingId,result.propertyId,result.matchStatus);
  }
  console.log('[housingintel-scraper] TMHA YouthBuild: '+stored+' public property records stored; vacancy and affordability remain unverified');
  return { source:'tmha_youthbuild', stored };
}
if (require.main === module) main().then(() => process.exit(0)).catch(err => {
  console.error('[housingintel-scraper]',err.message);
  process.exitCode=1;
});
module.exports={main};
