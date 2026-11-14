'use strict';
const crypto=require('node:crypto');
const {parseImport}=require('./import-listings');
const MAX_BYTES=32768;
function authorized(header,secret){
 if(typeof header!=='string'||typeof secret!=='string'||secret.length<32)return false;
 if(!/^Bearer [A-Za-z0-9_-]{32,256}$/.test(header))return false;
 const token=header.slice(7);
 const a=crypto.createHash('sha256').update(token).digest();
 const b=crypto.createHash('sha256').update(secret).digest();
 return crypto.timingSafeEqual(a,b);
}
async function readBody(req){
 let bytes=0,chunks=[];
 for await(const chunk of req){bytes+=chunk.length;if(bytes>MAX_BYTES)throw Object.assign(new Error('Payload too large'),{status:413});chunks.push(chunk);}
 return Buffer.concat(chunks).toString('utf8');
}
async function submit(req,db){
 const rows=parseImport(await readBody(req));
 if(rows.length!==1)throw Object.assign(new Error('Exactly one listing per submission'),{status:400});
 const row=rows[0];
 const id=crypto.createHash('sha256').update(row.source+'|'+row.sourceId).digest('hex');
 await db.query(`CREATE TABLE IF NOT EXISTS housing_review_queue (
 id TEXT PRIMARY KEY, source TEXT NOT NULL, source_id TEXT NOT NULL,
 payload JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
 submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT housing_review_status_check CHECK(status IN ('PENDING_REVIEW','APPROVED','REJECTED'))
 )`);
 const result=await db.query(`INSERT INTO housing_review_queue(id,source,source_id,payload)
 VALUES($1,$2,$3,$4::jsonb)
 ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()
 WHERE housing_review_queue.status='PENDING_REVIEW'
 RETURNING id,status`,[id,row.source,row.sourceId,JSON.stringify(row)]);
 if(!result.rowCount)throw Object.assign(new Error('Existing review is locked; cannot overwrite'),{status:409});
 return result.rows[0];
}
module.exports={authorized,readBody,submit};
