'use strict';
const {URL}=require('node:url');
const {upsertListing}=require('../db');
const {validate}=require('../import-listings');
const crypto=require('node:crypto');
const TIMEOUT=12000;
function safeUrl(value){
 const u=new URL(value);
 if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Only standard HTTPS URLs allowed');
 const host=u.hostname.toLowerCase();
 if(host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||/^\d+\.\d+\.\d+\.\d+$/.test(host)||host.includes(':'))throw Error('Private/IP hosts prohibited');
 return u;
}
async function fetchText(url){
 safeUrl(url);
 const res=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(TIMEOUT),headers:{'User-Agent':'HousingIntelBot/0.1 (+https://housingintel.onrender.com; rental listing indexing)','Accept':'text/html, application/ld+json'}});
 if(!res.ok)throw Error('HTTP '+res.status);
 if(res.headers.get('location'))throw Error('Redirect not followed');
 const type=res.headers.get('content-type')||'';
 if(!/html|json/.test(type))throw Error('Unsupported content type');
 const length=Number(res.headers.get('content-length')||0);if(length>1024*1024)throw Error('Page too large');
 const text=await res.text();if(text.length>1024*1024)throw Error('Page too large');
 return text;
}
function robotsRules(text,agent='HousingIntelBot'){
 const groups=[];let agents=[],rules=[];
 function flush(){if(agents.length)groups.push({agents,rules});agents=[];rules=[];}
 for(const line of text.split(/\r?\n/)){
  const m=line.split('#')[0].match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/);if(!m)continue;
  const key=m[1].toLowerCase(),value=m[2];
  if(key==='user-agent'){if(rules.length)flush();agents.push(value.toLowerCase());}
  else if((key==='allow'||key==='disallow')&&agents.length)rules.push({key,value});
 }
 flush();
 const specific=groups.filter(g=>g.agents.includes(agent.toLowerCase()));
 const selected=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
 return selected.flatMap(g=>g.rules);
}
function allowedByRobots(rules,path){
 const matching=rules.filter(r=>r.value&&path.startsWith(r.value)).sort((a,b)=>b.value.length-a.value.length||Number(b.key==='allow')-Number(a.key==='allow'));
 return !matching.length||matching[0].key==='allow';
}
async function robotsAllowed(url){
 const u=safeUrl(url);
 const robots=await fetch(u.origin+'/robots.txt',{redirect:'manual',signal:AbortSignal.timeout(TIMEOUT),headers:{'User-Agent':'HousingIntelBot/0.1'}});
 if(robots.status===404||robots.status===410)return true;
 if(!robots.ok)return false;
 const text=await robots.text();if(text.length>256000)return false;
 return allowedByRobots(robotsRules(text),u.pathname);
}
function jsonLd(text){
 const blocks=[];
 const re=/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi;
 let m;while((m=re.exec(text))!==null){try{blocks.push(JSON.parse(m[1].trim()));}catch{}}
 const nodes=[];
 function visit(obj){if(Array.isArray(obj)){obj.forEach(visit);return;}if(!obj||typeof obj!=='object')return;nodes.push(obj);if(obj['@graph'])visit(obj['@graph']);}
 blocks.forEach(visit);return nodes;
}
function extract(html,url){
 const nodes=jsonLd(html),out=[];
 for(const n of nodes){
  const types=[].concat(n['@type']||[]).map(String);
  if(!types.some(t=>/^(Apartment|House|SingleFamilyResidence|Residence|Accommodation|RealEstateListing)$/i.test(t)))continue;
  const a=n.address;
  if(!a||typeof a!=='object')continue;
  const address=a.streetAddress,city=a.addressLocality,zip=a.postalCode,state=a.addressRegion;
  if(!address||!city||!zip||!['OH','Ohio'].includes(state))continue;
  const offer=Array.isArray(n.offers)?n.offers[0]:n.offers||{};
  const rent=offer.price??null;
  const beds=n.numberOfBedrooms??null;
  const sourceId='ld-'+crypto.createHash('sha256').update(url+'|'+(n['@id']||n.url||address)).digest('hex');
  try{out.push(validate({source:'manual_other',sourceId,source_url:url,address,city,zip,state:'OH',bedrooms:beds,rent},out.length));}catch{}
 }
 return out;
}
async function collectSources(sources,{fetcher=fetchText,robots=robotsAllowed,store=upsertListing}={}){
 const report=[];const seen=new Set();
 for(const item of sources){
  const url=typeof item==='string'?item:item.url;
  try{
   safeUrl(url);
   if(!(await robots(url))){report.push({url,status:'robots_blocked',stored:0});continue;}
   const rows=extract(await fetcher(url),url);let stored=0;
   for(const row of rows){const id=row.source+'|'+row.sourceId;if(seen.has(id))continue;seen.add(id);await store(row);stored++;}
   report.push({url,status:rows.length?'ok':'no_structured_listings',stored});
  }catch(e){report.push({url,status:'error',error:e.message,stored:0});}
 }
 return report;
}
module.exports={safeUrl,robotsRules,allowedByRobots,jsonLd,extract,collectSources};
