'use strict';
const crypto = require('node:crypto');
const norm = x => String(x ?? '').toLowerCase().normalize('NFKC').replace(/[.,#]/g,' ').replace(/\s+/g,' ').trim();
const digest = s => crypto.createHash('sha256').update(s).digest('hex').slice(0,32);
function identify(row) {
  if (!row || !row.source || !row.sourceId) throw new Error('source and sourceId required');
  const listingId = 'listing_' + digest(norm(row.source) + '|' + String(row.sourceId).trim());
  const street = norm(row.address), city = norm(row.city), state = norm(row.state), zip = norm(row.zip);
  const unit = norm(row.unit);
  // Deliberately do not merge incomplete addresses or ambiguous multi-unit buildings.
  const addressComplete = !!(street && city && state && zip && /^\d+\s/.test(street));
  const multiUnit = row.multiUnit === true || row.unitRequired === true;
  const canMerge = addressComplete && (!multiUnit || !!unit) && row.addressVerified === true;
  const propertyId = canMerge
    ? 'property_' + digest([street,unit,city,state,zip].join('|'))
    : 'property_' + digest('unresolved|' + listingId);
  return { listingId, propertyId, matchStatus: canMerge ? 'CANONICAL_ADDRESS' : 'NEEDS_REVIEW' };
}
module.exports = { identify, norm };
