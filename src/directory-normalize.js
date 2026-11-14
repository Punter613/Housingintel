'use strict';
// Shared address normalization for OHFA directory and cross-source matching.
// Pure leaf module: no database, importer, or publication dependencies.
const norm=s=>String(s||'').toUpperCase().replace(/[.,#]/g,' ').replace(/\bBOULEVARD\b/g,'BLVD').replace(/\bAVENUE\b/g,'AVE').replace(/\bSTREET\b/g,'ST').replace(/\bROAD\b/g,'RD').replace(/\bDRIVE\b/g,'DR').replace(/\bLANE\b/g,'LN').replace(/\s+/g,' ').trim();
module.exports={norm};
