const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateGrossRent } = require('../src/eligibility');
test('unknown allowance remains pending', () => assert.equal(evaluateGrossRent({rent:710,ceiling:771}).status,'PENDING'));
test('exact ceiling passes', () => assert.equal(evaluateGrossRent({rent:710,tenantUtilityAllowance:61,ceiling:771}).status,'PASS'));
test('over ceiling fails', () => assert.equal(evaluateGrossRent({rent:710,tenantUtilityAllowance:62,ceiling:771}).status,'FAIL'));
test('rent alone over ceiling fails', () => assert.equal(evaluateGrossRent({rent:800,ceiling:771}).status,'FAIL'));
