'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { database,initDb } = require('./db');
const { evaluateGrossRent } = require('./eligibility');
const {authorized,submit}=require('./submissions');
const {submitPublic}=require('./public-leads');
const port = Number(process.env.PORT || 10000);
const server = http.createServer(async (req, res) => {
  const send = (status, data) => {
    res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
    res.end(JSON.stringify(data));
  };
  try {
    const url = new URL(req.url, 'http://localhost');
    if(req.method==='GET' && url.pathname==='/add'){
      const html=fs.readFileSync(path.join(__dirname,'..','public','add.html'));
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'"});
      return res.end(html);
    }
    if (req.method === 'GET' && url.pathname === '/') {
      const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'));
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'"});
      return res.end(html);
    }
    if (req.method === 'GET' && url.pathname === '/submit') {
      const html=fs.readFileSync(path.join(__dirname,'..','public','submit.html'));
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'"});
      return res.end(html);
    }
    if (req.method === 'GET' && (url.pathname === '/review' || url.pathname === '/review.html')) {
      const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'review.html'));
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"});
      return res.end(html);
    }
    if (req.method === 'GET' && url.pathname === '/health') {
      const db = database();
      if (!db) return send(503, { ok:false, database:'not_configured' });
      await db.query('SELECT 1');
      return send(200, { ok:true, database:'connected' });
    }
    if(url.pathname==='/api/leads' && req.method==='POST'){
      if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return send(415,{error:'json_required'});
      const db=database();if(!db)return send(503,{error:'database_not_configured'});
      try{return send(202,await submitPublic(req,db,req.socket.remoteAddress));}
      catch(e){if(e.status===429)return send(429,{error:'Too many suggestions; try again later'});if(e.status===413)return send(413,{error:'Payload too large'});if(e.status===400||/Row |Invalid URL/.test(e.message))return send(400,{error:'Invalid listing details'});return send(503,{error:'service_unavailable'});}
    }
    if (url.pathname === '/api/review-submissions' && req.method === 'GET') {
      if(!authorized(req.headers.authorization,process.env.HOUSING_IMPORT_TOKEN))return send(401,{error:'unauthorized'});
      const db=database();if(!db)return send(503,{error:'database_not_configured'});
      await initDb();
      const result=await db.query("SELECT id,source,source_id,payload,status,submitted_at,updated_at FROM housing_review_queue WHERE status='PENDING_REVIEW' ORDER BY submitted_at DESC LIMIT 100");
      return send(200,{queue:result.rows});
    }
    if (url.pathname === '/api/review-submissions' && req.method === 'POST') {
      if(!authorized(req.headers.authorization,process.env.HOUSING_IMPORT_TOKEN))return send(401,{error:'unauthorized'});
      if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return send(415,{error:'json_required'});
      const db=database();if(!db)return send(503,{error:'database_not_configured'});
      try{const result=await submit(req,db);return send(202,{accepted:true,id:result.id,status:result.status});}
      catch(e){if(e instanceof SyntaxError||/Row |Import must|Duplicate source|Exactly one listing/.test(e.message))return send(400,{error:'invalid_listing',detail:e.message});return send(e.status||503,{error:e.status===413?'payload_too_large':e.status===409?'review_locked':'service_unavailable'});}
    }
    if(req.method==='GET' && url.pathname==='/api/collection-status'){
      const config=JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','sources.json'),'utf8'));
      const configured=(config.pages||[]).filter(s=>s.enabled===true);
      const db=database();
      if(!db)return send(503,{error:'database_not_configured',enabledSources:configured.length});
      const stats=await db.query('SELECT COUNT(*)::int AS listings, MAX(last_seen) AS latest_seen FROM housing_listings');
      return send(200,{enabledSources:configured.length,listings:stats.rows[0].listings,latestSeen:stats.rows[0].latest_seen,note:'Latest seen is not proof that a listing remains available.'});
    }
    if (req.method === 'GET' && url.pathname === '/api/listings') {
      const db = database();
      if (!db) return send(503, { error:'database_not_configured' });
      const result = await db.query('SELECT id, source, source_url, address, city, state, rent, bedrooms, first_seen, last_seen FROM housing_listings ORDER BY last_seen DESC LIMIT 100');
      return send(200, { listings:result.rows, note:'All listing data is unverified; eligibility requires verified utility allowances.' });
    }
    return send(404, { error:'not_found' });
  } catch (err) {
    console.error('[server]', err.message);
    return send(503, { error:'service_unavailable' });
  }
});
if (require.main === module) server.listen(port, '0.0.0.0', () => console.log('HousingIntel listening on', port));
module.exports = { server };
