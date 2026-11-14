'use strict';
const {candidateKey}=require('./directory-linkage');
const {norm}=require('./identity');

// Conservative candidate detection only. No cross-source merge, no rental claims.
// A missing ZIP, explicit unit, multi-unit flag or ambiguous street never qualifies.
function crossSourceCandidateKey(row){
 if(row.unit || row.multiUnit===true || row.unitRequired===true)return null;
 return candidateKey(row);
}
function compareCrossSource(row,records){
 const key=crossSourceCandidateKey(row);
 if(!key)return {status:'NEEDS_REVIEW',matches:[]};
 const matches=records.filter(other=>
  other.source!==row.source &&
  crossSourceCandidateKey({...other,zip:other.zip??other.raw?.zip,unit:other.unit??other.raw?.unit,multiUnit:other.raw?.multiUnit})===key
 ).map(other=>({listingId:other.id,source:other.source}));
 if(matches.length)return {status:'CROSS_SOURCE_CANDIDATE',matches};
 return {status:'NO_CROSS_SOURCE_MATCH',matches:[]};
}
module.exports={crossSourceCandidateKey,compareCrossSource};
