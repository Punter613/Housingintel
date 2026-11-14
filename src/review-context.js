'use strict';
const {matchDirectory}=require('./directory-linkage');
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
    let found;
    try{
      found=await db.query('SELECT id,source,project_name,section_8_program,address,city,state,zip FROM housing_property_directory WHERE county=$1 AND state=$2 AND zip=$3 AND lower(city)=lower($4)', ['TRUMBULL','OH',String(lead.zip||''),String(lead.city||'')]);
    }catch(error){
      // Only a database lookup failure may degrade to unavailable.
      result.push({...item,directoryContext:{status:'LOOKUP_UNAVAILABLE',matches:[]}});
      continue;
    }
    // Invariant violations and matcher defects must propagate, never masquerade as lookup failures.
    const {directoryContext}=buildReviewContext(lead,found.rows,matcher);
    result.push({...item,directoryContext});
  }
  return result;
}
module.exports={FIELDS,buildReviewContext,enrichQueue};
