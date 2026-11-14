'use strict';
const {identify,norm}=require('./identity');

// The only published-listing writer. Caller owns BEGIN/COMMIT/ROLLBACK.
// A source classification is part of listing identity; an ON CONFLICT(id)
// guard alone cannot prevent a differently classified duplicate.
async function publishListing(client,row){
 const identity=identify(row);
 const sourceUrl=new URL(row.source_url).href;
 // Serialize concurrent publications of the same URL within the transaction.
 await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',[sourceUrl]);
 const candidates=await client.query(
  'SELECT id,source,address,city,state,raw FROM housing_listings WHERE source_url=$1 AND id<>$2 FOR UPDATE',
  [sourceUrl,identity.listingId]);
 const sameUnit=c=>norm(c.address)===norm(row.address) &&
  norm(c.city)===norm(row.city) && norm(c.state)===norm(row.state) &&
  norm(c.raw?.zip)===norm(row.zip) && norm(c.raw?.unit)===norm(row.unit);
 if(row.source==='manual_other' && candidates.rows.some(c=>c.source!=='manual_other' && sameUnit(c))){
  throw Object.assign(Error('Named-source listing already exists for this URL and unit; review provenance'),{status:409,code:'PROVENANCE_REVIEW_REQUIRED'});
 }
 await client.query(`INSERT INTO housing_properties (id,match_status,address,unit,city,state,zip)
  VALUES($1,$2,$3,$4,$5,$6,$7)
  ON CONFLICT(id) DO UPDATE SET updated_at=now()`,
  [identity.propertyId,identity.matchStatus,row.address||null,row.unit||null,row.city||null,row.state||null,row.zip||null]);
 await client.query(`INSERT INTO housing_listings
  (id,property_id,source_id,source,source_url,address,city,state,rent,bedrooms,raw)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
  ON CONFLICT(id) DO UPDATE SET
   property_id=EXCLUDED.property_id,source_url=EXCLUDED.source_url,
   address=EXCLUDED.address,city=EXCLUDED.city,state=EXCLUDED.state,
   rent=EXCLUDED.rent,bedrooms=EXCLUDED.bedrooms,raw=EXCLUDED.raw,last_seen=now()`,
  [identity.listingId,identity.propertyId,String(row.sourceId),row.source,sourceUrl,row.address||null,row.city||null,row.state||null,row.rent??null,row.bedrooms??null,JSON.stringify(row)]);
 return identity;
}
module.exports={publishListing};
