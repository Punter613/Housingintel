'use strict';
const {matchDirectory}=require('./directory-linkage');
const {compareCrossSource}=require('./cross-source-identity');
const FIELDS=['rent','availability','voucherAcceptance','eligibility','verificationStatus'];
function buildReviewContext(lead,properties,matcher=matchDirectory){
  const before=Object.fromEntries(FIELDS.map(k=>[k,lead[k]]));
  const context=matcher(lead,properties);
  for(const k of FIELDS)if(!Object.is(lead[k],before[k]))throw Error('Directory lookup mutated '+k);
  return {lead, directoryContext:context};
}
async function enrichQueue(db,queue,matcher=matchDirectory){
  const result=[];
  for(const item of queue){
    const lead=item.payload||{};
    let directoryContext;
    try{
      const found=await db.query('SELECT id,source,project_name,section_8_program,address,city,state,zip FROM housing_property_directory WHERE county=$1 AND state=$2 AND zip=$3 AND lower(city)=lower($4)', ['TRUMBULL','OH',String(lead.zip||''),String(lead.city||'')]);
      directoryContext=buildReviewContext(lead,found.rows,matcher).directoryContext;
    }catch(error){
      if(error.message.startsWith('Directory lookup mutated'))throw error;
      directoryContext={status:'LOOKUP_UNAVAILABLE',matches:[]};
    }
    let crossSourceContext;
    try{
      const listings=await db.query(
        'SELECT id,source,address,city,state,raw FROM housing_listings WHERE lower(city)=lower($1) AND state=$2 LIMIT 500',
        [String(lead.city||''),String(lead.state||'OH')]);
      const before=JSON.stringify(lead);
      crossSourceContext=compareCrossSource(lead,listings.rows);
      if(JSON.stringify(lead)!==before)throw Error('Cross-source lookup mutated lead');
    }catch(error){
      if(error.message==='Cross-source lookup mutated lead')throw error;
      crossSourceContext={status:'LOOKUP_UNAVAILABLE',matches:[]};
    }
    result.push({...item,directoryContext,crossSourceContext});
  }
  return result;
}
module.exports={FIELDS,buildReviewContext,enrichQueue};
