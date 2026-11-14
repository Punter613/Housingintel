'use strict';
const crypto=require('node:crypto');
const STATUSES=new Set(['PENDING_REVIEW','CONFIRMED','DISMISSED']);
function pairId(a,b){
 if(!a||!b||a===b)throw Error('Two distinct listing IDs required');
 const [first,second]=[String(a),String(b)].sort();
 return 'identity_'+crypto.createHash('sha256').update(JSON.stringify([first,second])).digest('hex').slice(0,32);
}
async function recordCandidate(client,a,b){
 const id=pairId(a,b);
 await client.query(`INSERT INTO housing_identity_review
  (id,listing_a,listing_b,reason,status)
  VALUES($1,$2,$3,'CROSS_SOURCE_ADDRESS_CANDIDATE','PENDING_REVIEW')
  ON CONFLICT(id) DO UPDATE SET last_detected=now()`,
  [id,...[a,b].sort()]);
 return id;
}
async function decideIdentity(client,id,status){
 if(!STATUSES.has(status)||status==='PENDING_REVIEW')throw Object.assign(Error('Invalid identity decision'),{status:400});
 const result=await client.query(`UPDATE housing_identity_review SET status=$2,decided_at=now()
 WHERE id=$1 AND status='PENDING_REVIEW' RETURNING id,status`,[id,status]);
 if(result.rowCount!==1)throw Object.assign(Error('Identity review not pending'),{status:409});
 return result.rows[0];
}
module.exports={pairId,recordCandidate,decideIdentity};
