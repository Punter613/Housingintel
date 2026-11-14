'use strict';
const {validate}=require('./import-listings');
const {identify}=require('./identity');

// Approval is a single database transaction: no published listing unless the queue
// record is successfully transitioned from PENDING_REVIEW to APPROVED.
async function approve(db,id){
 if(!/^[a-f0-9]{64}$/.test(String(id||'')))throw Object.assign(Error('Invalid review ID'),{status:400});
 const client=await db.connect();
 try{
  await client.query('BEGIN');
  const found=await client.query('SELECT payload,status FROM housing_review_queue WHERE id=$1 FOR UPDATE',[id]);
  if(!found.rowCount)throw Object.assign(Error('Review not found'),{status:404});
  if(found.rows[0].status!=='PENDING_REVIEW')throw Object.assign(Error('Review already decided'),{status:409});
  const row=validate(found.rows[0].payload,0);
  const identity=identify(row);
  await client.query(`INSERT INTO housing_properties (id,match_status,address,unit,city,state,zip)
    VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET updated_at=now()`,
    [identity.propertyId,identity.matchStatus,row.address,row.unit,row.city,row.state,row.zip]);
  await client.query(`INSERT INTO housing_listings
    (id,property_id,source_id,source,source_url,address,city,state,rent,bedrooms,raw)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
    ON CONFLICT(id) DO UPDATE SET property_id=EXCLUDED.property_id,source_url=EXCLUDED.source_url,
    address=EXCLUDED.address,city=EXCLUDED.city,state=EXCLUDED.state,rent=EXCLUDED.rent,
    bedrooms=EXCLUDED.bedrooms,raw=EXCLUDED.raw,last_seen=now()`,
    [identity.listingId,identity.propertyId,row.sourceId,row.source,row.source_url,row.address,row.city,row.state,row.rent??null,row.bedrooms??null,JSON.stringify(row)]);
  const changed=await client.query("UPDATE housing_review_queue SET status='APPROVED',updated_at=now() WHERE id=$1 AND status='PENDING_REVIEW' RETURNING id,status",[id]);
  if(changed.rowCount!==1)throw Object.assign(Error('Review conflict'),{status:409});
  await client.query('COMMIT');
  return {id,status:'APPROVED',listingId:identity.listingId};
 }catch(e){await client.query('ROLLBACK');throw e;}
 finally{client.release();}
}
module.exports={approve};
