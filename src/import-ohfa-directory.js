'use strict';
// Import OHFA property DIRECTORY records, never advertise them as vacant listings.
const fs = require('node:fs');
const crypto = require('node:crypto');
const {database} = require('./db');

function parseCsv(input) {
  const rows=[]; let row=[],field='',quoted=false;
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(quoted){
      if(c==='"' && input[i+1]==='"'){field+='"';i++;}
      else if(c==='"')quoted=false;
      else field+=c;
    }else if(c==='"')quoted=true;
    else if(c===','){row.push(field);field='';}
    else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted)throw Error('Unclosed CSV quote');
  if(field||row.length){row.push(field);rows.push(row);}
  if(!rows.length)throw Error('Empty CSV');
  const headers=rows.shift().map(s=>s.replace(/^\uFEFF/,'').trim());
  if(new Set(headers).size!==headers.length)throw Error('Duplicate CSV headers');
  return rows.filter(r=>r.some(Boolean)).map((values,i)=>{
    if(values.length!==headers.length)throw Error('CSV column mismatch at row '+(i+2));
    return Object.fromEntries(headers.map((h,j)=>[h,values[j]]));
  });
}
const norm=s=>String(s||'').toUpperCase().replace(/[.,#]/g,' ').replace(/\bBOULEVARD\b/g,'BLVD').replace(/\bAVENUE\b/g,'AVE').replace(/\bSTREET\b/g,'ST').replace(/\bROAD\b/g,'RD').replace(/\bDRIVE\b/g,'DR').replace(/\bLANE\b/g,'LN').replace(/\s+/g,' ').trim();
function prepare(rows){
  const seen=new Set();
  return rows.map((r,i)=>{
    if(!r.address||!r.city||!r.zip||r.state!=='OH'||!/^[0-9]{5}$/.test(r.zip))throw Error('Incomplete Ohio address row '+(i+2));
    const key=[norm(r.address),norm(r.city),'OH',r.zip].join('|');
    if(seen.has(key))throw Error('Duplicate normalized address: '+key);
    seen.add(key);
    const id='ohfa_'+crypto.createHash('sha256').update(key).digest('hex').slice(0,32);
    return {id,key,row:r};
  });
}
async function main(){
  const file=process.argv[2];
  if(!file)throw Error('Usage: node src/import-ohfa-directory.js directory.csv [--commit]');
  const entries=prepare(parseCsv(fs.readFileSync(file,'utf8')));
  console.log('VALIDATED '+entries.length+' directory properties; vacancies/rents NOT verified');
  if(!process.argv.includes('--commit'))return;
  if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required');
  const db=database(),client=await db.connect();
  try{
    await client.query('BEGIN');
    await client.query(`CREATE TABLE IF NOT EXISTS housing_property_directory (
      id TEXT PRIMARY KEY, source TEXT NOT NULL, source_url TEXT NOT NULL,
      county TEXT NOT NULL, address TEXT NOT NULL, city TEXT NOT NULL,
      state TEXT NOT NULL, zip TEXT NOT NULL, project_name TEXT,
      owner_name TEXT, section_8_program BOOLEAN,
      source_updated TEXT, source_data JSONB NOT NULL,
      imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    for(const e of entries){
      const r=e.row;
      await client.query(`INSERT INTO housing_property_directory
        (id,source,source_url,county,address,city,state,zip,project_name,owner_name,section_8_program,source_updated,source_data)
        VALUES ($1,'ohfa', $2,'TRUMBULL',$3,$4,'OH',$5,$6,$7,$8,$9,$10::jsonb)
        ON CONFLICT(id) DO UPDATE SET project_name=EXCLUDED.project_name,
          owner_name=EXCLUDED.owner_name,section_8_program=EXCLUDED.section_8_program,
          source_updated=EXCLUDED.source_updated,source_data=EXCLUDED.source_data,
          imported_at=now()`,
        [e.id,r.source_url,r.address,r.city,r.zip,r.project_name,r.owner,r.section_8_program==='Yes',r.source_updated,JSON.stringify(r)]);
    }
    await client.query('COMMIT');
    console.log('IMPORTED '+entries.length+' directory properties; NO rental vacancies asserted');
  }catch(e){await client.query('ROLLBACK');throw e;}
  finally{client.release();await db.end();}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={parseCsv,prepare,norm};
