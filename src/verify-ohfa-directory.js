'use strict';
const fs=require('node:fs');
const crypto=require('node:crypto');
const {database}=require('./db');
const {parseCsv,prepare}=require('./import-ohfa-directory');
async function main(){
 const file=process.argv[2];if(!file)throw Error('CSV path required');
 const rows=prepare(parseCsv(fs.readFileSync(file,'utf8')));
 if(rows.length!==164)throw Error('Expected 164 Trumbull properties; got '+rows.length);
 const yes=rows.filter(x=>x.row.section_8_program==='Yes').length;
 if(yes!==98)throw Error('Expected 98 Section 8 flags; got '+yes);
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL missing');
 const db=database(),c=await db.connect();
 try{
  const before=await c.query('SELECT count(*)::int AS n FROM housing_listings');
  const directory=await c.query('SELECT count(*)::int AS n FROM housing_property_directory WHERE county=$1',['TRUMBULL']);
  const after=await c.query('SELECT count(*)::int AS n FROM housing_listings');
  const sample=await c.query('SELECT address,city,zip,owner_name,section_8_program,source_data FROM housing_property_directory WHERE county=$1 ORDER BY id LIMIT 5',['TRUMBULL']);
  const results={sourceRows:rows.length,sourceSection8Flags:yes,directoryCount:directory.rows[0].n,listingsBefore:before.rows[0].n,listingsAfter:after.rows[0].n,samples:sample.rows.map(x=>({address:x.address,city:x.city,zip:x.zip,owner:x.owner_name,section8:x.section_8_program}))};
  console.log(JSON.stringify(results,null,2));
  if(directory.rows[0].n!==164||before.rows[0].n!==after.rows[0].n)throw Error('Database acceptance count mismatch');
  for(const s of sample.rows){
   const key=[s.address,s.city,s.zip].join('|');
   const source=rows.find(x=>x.row.address===s.address&&x.row.city===s.city&&x.row.zip===s.zip);
   if(!source||source.row.owner!==s.owner_name||(source.row.section_8_program==='Yes')!==s.section_8_program)throw Error('Source field mismatch: '+key);
  }
  console.log('ACCEPTANCE PASSED: 164 directory rows, unchanged listings, spot checks match source');
 }finally{c.release();await db.end();}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
