'use strict';
// Collector-only persistence boundary. Never publishes a rental.
const crypto=require('node:crypto');
const {validate}=require('./import-listings');
function pendingRow(raw){
 const row=validate({...raw,availability:'UNVERIFIED',voucherAcceptance:'UNVERIFIED',addressVerified:false},0);
 return {...row,availability:'UNVERIFIED',voucherAcceptance:'UNVERIFIED',addressVerified:false};
}
async function queueCollected(db,raw){
 if(!db||typeof db.query!=='function')throw Error('Database query required');
 const row=pendingRow(raw);
 const id=crypto.createHash('sha256').update(row.source+'|'+row.sourceId).digest('hex');
 const result=await db.query(`INSERT INTO housing_review_queue(id,source,source_id,payload,status)
 VALUES($1,$2,$3,$4::jsonb,'PENDING_REVIEW')
 ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()
 WHERE housing_review_queue.status='PENDING_REVIEW'
 RETURNING id,status`,[id,row.source,row.sourceId,JSON.stringify(row)]);
 if(!result.rowCount)throw Object.assign(Error('Existing review is locked; cannot overwrite'),{status:409});
 return result.rows[0];
}
module.exports={pendingRow,queueCollected};
