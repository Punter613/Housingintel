'use strict';
const {matchDirectory}=require('./directory-linkage');
const FIELDS=['rent','availability','voucherAcceptance','eligibility','verificationStatus'];
function buildReviewContext(lead,properties){
  const before=Object.fromEntries(FIELDS.map(k=>[k,lead[k]]));
  const context=matchDirectory(lead,properties);
  for(const k of FIELDS)if(!Object.is(lead[k],before[k]))throw Error('Directory lookup mutated '+k);
  return {lead, directoryContext:context};
}
async function enrichQueue(db,queue){
  const result=[];
  for(const item of queue){
    const lead=item.payload||{};
    try{
      const found=await db.query('SELECT id,source,project_name,section_8_program,address,city,state,zip FROM housing_property_directory WHERE county=$1 AND state=$2 AND zip=$3 AND lower(city)=lower($4)', ['TRUMBULL','OH',String(lead.zip||''),String(lead.city||'')]);
      const {directoryContext}=buildReviewContext(lead,found.rows);
      result.push({...item,directoryContext});
    }catch(error){
      // Missing directory, database error, or unavailable lookup is never "no match".
      result.push({...item,directoryContext:{status:'LOOKUP_UNAVAILABLE',matches:[]}});
    }
  }
  return result;
}
module.exports={FIELDS,buildReviewContext,enrichQueue};
