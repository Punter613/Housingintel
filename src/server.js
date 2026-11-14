'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { database } = require('./db');
const { evaluateGrossRent } = require('./eligibility');
const port = Number(process.env.PORT || 10000);
const server = http.createServer(async (req, res) => {
  const send = (status, data) => {
    res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
    res.end(JSON.stringify(data));
  };
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && (url.pathname === '/review' || url.pathname === '/review.html')) {
      const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'review.html'));
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"});
      return res.end(html);
    }
    if (req.method === 'GET' && url.pathname === '/') {
      return send(200, { app:'HousingIntel', status:'initializing', endpoints:['/health','/api/listings','/review'] });
    }
    if (req.method === 'GET' && url.pathname === '/health') {
      const db = database();
      if (!db) return send(503, { ok:false, database:'not_configured' });
      await db.query('SELECT 1');
      return send(200, { ok:true, database:'connected' });
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
