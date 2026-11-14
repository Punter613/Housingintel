'use strict';

/**
 * Conservative gross-rent eligibility.
 * An allowance of 0 must be explicitly confirmed, never assumed.
 */
function evaluateGrossRent({ rent, tenantUtilityAllowance, ceiling }) {
  for (const [key, value] of Object.entries({ rent, ceiling })) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new TypeError(key + ' must be a nonnegative finite number');
    }
  }
  if (rent > ceiling) return { status: 'FAIL', reason: 'Contract rent exceeds ceiling', grossRent: null };
  if (typeof tenantUtilityAllowance !== 'number' || !Number.isFinite(tenantUtilityAllowance) || tenantUtilityAllowance < 0) {
    return { status: 'PENDING', reason: 'Utility allowance not verified', grossRent: null };
  }
  const grossRent = Math.round((rent + tenantUtilityAllowance) * 100) / 100;
  return { status: grossRent <= ceiling ? 'PASS' : 'FAIL', grossRent, ceiling, headroom: Math.round((ceiling - grossRent) * 100) / 100 };
}
module.exports = { evaluateGrossRent };
