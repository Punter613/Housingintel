'use strict';
const crypto=require('node:crypto');
const {parseImport,validate}=require('./import-listings');
const {readBody}=require('./submissions');
const WINDOW=60*60*1000, LIMIT=5;
const attempts=new Map();
function allowed(ip,now=Date.now()){
 for(const [key,v] of attempts)if(now-v.since>WINDOW)attempts.delete(key);
 const key=crypto.createHash('sha256').update(ip||'unknown').digest('hex');
 const item=attempts.get(key);
 if(!item||now-item.since>WINDOW){attempts.set(key,{since:now,count:1});return true;}
 if(item.count>=LIMIT)return false;
 item.count++;return true;
}
async function submitPublic(req,db,ip){
 const raw=await readBody(req);
 let data;try{data=JSON.parse(raw);}catch{throw Object.assign(Error('Invalid JSON'),{status:400});}
 if(!data||Array.isArray(data)||typeof data!=='object')throw Object.assign(Error('Listing object required'),{status:400});
 if(data.website)throw Object.assign(Error('Rejected'),{status:400});
 if(!allowed(ip))throw Object.assign(Error('Rate limit exceeded'),{status:429});
 const url=new URL(String(data.source_url||''));
 if(!['http:','https:'].includes(url.protocol))throw Object.assign(Error('Listing URL required'),{status:400});
 const sourceId='url-'+crypto.createHash('sha256').update(url.href).digest('hex');
 const row=validate({...data,sourceId,source:data.source||'manual_other',availability:'UNVERIFIED'},0);
 await db.query(`CREATE TABLE IF NOT EXISTS housing_review_queue (
 id TEXT PRIMARY KEY,source TEXT NOT NULL,source_id TEXT NOT NULL,payload JSONB NOT NULL,
 status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT housing_review_status_check CHECK(status IN ('PENDING_REVIEW','APPROVED','REJECTED'))
 )`);
 const id=crypto.createHash('sha256').update(row.source+'|'+row.sourceId).digest('hex');
 const result=await db.query(`INSERT INTO housing_review_queue(id,source,source_id,payload)
 VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(id) DO NOTHING RETURNING id`,
 [id,row.source,row.sourceId,JSON.stringify(row)]);
 return {accepted:true,duplicate:!result.rowCount};
}
module.exports={submitPublic,allowed};
