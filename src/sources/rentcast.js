'use strict';
const URL='https://api.rentcast.io/v1/listings/rental/long-term';
const CITIES=['Warren','Niles','Girard','Hubbard','Cortland','Newton Falls','Lordstown','McDonald'];
function normalizeListing(r) {
  if(!r || !r.id || !r.addressLine1 || !r.city || !r.state || !r.zipCode) return null;
  if(r.county && r.county.toLowerCase()!=='trumbull') return null;
  if(r.status !== 'Active') return null;
  return {
    source:'rentcast',sourceId:String(r.id),
    source_url:null,
    address:r.addressLine1,unit:r.addressLine2||null,
    city:r.city,state:r.state,zip:String(r.zipCode),
    county:r.county||null,multiUnit:Boolean(r.addressLine2),
    addressVerified:false,
    bedrooms:r.bedrooms??null,bathrooms:r.bathrooms??null,
    rent:r.price??null,availability:'ADVERTISED_ACTIVE_NOT_CONFIRMED',
    voucherAcceptance:'UNVERIFIED',tenantUtilityAllowance:null,
    listingContact:r.listingAgent||null,
    sourceLastSeen:r.lastSeenDate||null,
    rawSource:r
  };
}
async function collectRentCast({apiKey=process.env.RENTCAST_API_KEY,fetchFn=fetch,cities=CITIES}={}) {
  if(!apiKey) throw new Error('RENTCAST_API_KEY is missing');
  // This collector is deliberately manual-only. No scheduled paid API calls.
  if(process.env.RENTCAST_ALLOW_REQUESTS!=='YES') throw new Error('RentCast requests disabled; explicit opt-in required');
  if(cities.length>8) throw new Error('Hard cap: at most eight API calls per invocation');
  const rows=[];
  for(const city of cities){
    const url=new URLSearchParams({city,state:'OH',status:'Active',limit:'100'});
    const response=await fetchFn(URL+'?'+url,{headers:{'X-Api-Key':apiKey,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
    if(!response.ok) throw new Error('RentCast HTTP '+response.status+' for '+city);
    const items=await response.json();
    if(!Array.isArray(items)) throw new Error('RentCast response not an array for '+city);
    for(const item of items) {const row=normalizeListing(item);if(row) rows.push(row);}
  }
  return rows;
}
module.exports={collectRentCast,normalizeListing,CITIES};
