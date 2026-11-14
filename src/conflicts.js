'use strict';
/** Compare source claims without overwriting or asserting fraud. */
function compareListings(listings) {
  const conflicts = [];
  const fields = ['rent','bedrooms','landlordPhone','landlordName','availability'];
  for (const field of fields) {
    const claims = listings
      .filter(row => row[field] !== undefined && row[field] !== null && row[field] !== '')
      .map(row => ({ source:row.source, sourceId:row.sourceId, value:row[field] }));
    if (new Set(claims.map(x => String(x.value).trim().toLowerCase())).size > 1) {
      conflicts.push({ field, claims, status:'REVIEW_REQUIRED' });
    }
  }
  return conflicts;
}
module.exports = { compareListings };
