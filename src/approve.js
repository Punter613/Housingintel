'use strict';
const {validate}=require('./import-listings');
const {publishListing}=require('./publish-listing');

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
  const identity=await publishListing(client,row);
  const changed=await client.query("UPDATE housing_review_queue SET status='APPROVED',updated_at=now() WHERE id=$1 AND status='PENDING_REVIEW' RETURNING id,status",[id]);
  if(changed.rowCount!==1)throw Object.assign(Error('Review conflict'),{status:409});
  await client.query('COMMIT');
  return {id,status:'APPROVED',listingId:identity.listingId};
 }catch(e){await client.query('ROLLBACK');throw e;}
 finally{client.release();}
}
module.exports={approve};
