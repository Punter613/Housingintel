'use strict';
const SOURCE_URL = 'https://trumbulltmha.org/youthbuild-property/';
const clean = s => String(s || '').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
function parseYouthBuild(html) {
  if (!/Housing Choice Vouchers accepted/i.test(html)) throw new Error('TMHA voucher program statement not found');
  const matches = [...html.matchAll(/<h2[^>]*>\s*(\d+\s+[^<]+?)\s*<\/h2>([\s\S]*?)(?=<h2\b|<h4\b|<footer\b|$)/gi)];
  const records = [];
  for (const match of matches) {
    const section = match[2];
    const address = clean(match[1]).replace(/\.$/,'');
    const zip = (section.match(/Warren,\s*(?:Ohio|OH)\s*(\d{5})/i)||[])[1];
    const beds = (section.match(/(\d+)\s*Bedrooms?\s*[–-]\s*([\d.]+)\s*Bathrooms?/i)||[]);
    const manager = (section.match(/Property Manager:\s*<\/[^>]+>\s*<[^>]+>([^<]+)/i)||[])[1] ||
      (clean(section).match(/Property Manager:\s*(.*?)\s*Office address:/i)||[])[1];
    if (!zip || !beds) continue;
    records.push({
      source:'tmha_youthbuild',
      sourceId:address.toLowerCase().replace(/\s+/g,'-')+'-'+zip,
      source_url:SOURCE_URL,
      address, city:'Warren',state:'OH',zip,
      unit:null, multiUnit:false, addressVerified:true,
      bedrooms:Number(beds[1]),bathrooms:Number(beds[2]),
      propertyType:'single_family',
      landlordName:manager ? clean(manager) : null,
      landlordPhone:'330-369-3333',
      rent:null, deposit:null, availability:null,
      voucherProgramAcceptance:'PUBLISHED_PROGRAM_LEVEL',
      listingKind:'PROPERTY_DIRECTORY_NOT_CONFIRMED_VACANT',
      provenance:{url:SOURCE_URL, publisher:'Trumbull Metropolitan Housing Authority',retrievedAt:new Date().toISOString()}
    });
  }
  if (records.length === 0) throw new Error('No TMHA YouthBuild property records parsed; page structure may have changed');
  return records;
}
async function collectYouthBuild(fetchFn = fetch) {
  const response = await fetchFn(SOURCE_URL, {headers:{'User-Agent':'HousingIntel/0.1 (public directory research)'} ,signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw new Error('TMHA returned HTTP '+response.status);
  return parseYouthBuild(await response.text());
}
module.exports={collectYouthBuild,parseYouthBuild,SOURCE_URL};
