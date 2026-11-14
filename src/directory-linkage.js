'use strict';
// Read-only candidate linkage. A directory association is NOT rental availability evidence.
const {norm}=require('./directory-normalize');
function candidateKey(x){
  const address=norm(x.address),city=norm(x.city),state=norm(x.state),zip=String(x.zip||'').trim();
  if(!/^\d+\s/.test(address)||!city||state!=='OH'||!/^\d{5}$/.test(zip))return null;
  // Ranges, unit designators, and ambiguous building addresses require manual review.
  if(/\d+\s*[-–]\s*\d+/.test(address)||/\b(APT|UNIT|STE|SUITE|BLDG|BUILDING|LOT)\b/.test(address))return null;
  return [address,city,state,zip].join('|');
}
function matchDirectory(lead,properties){
  const key=candidateKey(lead);
  if(!key)return {status:'NEEDS_REVIEW',matches:[]};
  const matches=properties.filter(p=>candidateKey(p)===key);
  if(matches.length===1)return {status:'DIRECTORY_ADDRESS_CANDIDATE',matches:matches.map(p=>({directoryId:p.id,source:p.source,projectName:p.project_name,section8Program:p.section_8_program}))};
  return {status:matches.length?'AMBIGUOUS_DIRECTORY_ADDRESS':'NO_DIRECTORY_MATCH',matches:[]};
}
async function findDirectoryCandidates(db,lead){
  const key=candidateKey(lead);
  if(!key)return {status:'NEEDS_REVIEW',matches:[]};
  const result=await db.query('SELECT id,source,project_name,section_8_program,address,city,state,zip FROM housing_property_directory WHERE county=$1 AND state=$2 AND zip=$3 AND lower(city)=lower($4)', ['TRUMBULL','OH',lead.zip,lead.city]);
  return matchDirectory(lead,result.rows);
}
module.exports={candidateKey,matchDirectory,findDirectoryCandidates};
