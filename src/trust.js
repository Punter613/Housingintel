'use strict';

/**
 * Trust assessment is independent of voucher eligibility and availability.
 * Platform badges are claims of verification, not proof of ownership.
 * Missing information triggers review, not an accusation.
 */
const SOURCES = Object.freeze({
  official: { scrutiny: 'standard' },
  vetted_directory: { scrutiny: 'standard' },
  listing_platform: { scrutiny: 'standard' },
  user_submitted: { scrutiny: 'enhanced' },
  open_classifieds: { scrutiny: 'enhanced' }
});

function assessTrust({ sourceClass = 'user_submitted', signals = [], evidence = [] } = {}) {
  const source = SOURCES[sourceClass] || SOURCES.user_submitted;
  const findings = [];
  let severe = false;
  let suspicious = false;
  for (const signal of signals) {
    const type = signal && signal.type;
    if (type === 'verified_owner_or_agent' && signal.verified === true) {
      findings.push({ type, result: 'positive', evidenceId: signal.evidenceId || null });
    } else if (type === 'platform_verified_badge') {
      findings.push({ type, result: 'source_claim', evidenceId: signal.evidenceId || null });
    } else if (type === 'advance_payment_before_viewing' || type === 'unusual_payment_method' || type === 'conflicting_property_address') {
      suspicious = true;
      if (type === 'advance_payment_before_viewing' && signal.confirmed === true) severe = true;
      findings.push({ type, result: 'risk', evidenceId: signal.evidenceId || null });
    } else if (type === 'photo_reused_at_different_address') {
      suspicious = true;
      findings.push({ type, result: 'review', evidenceId: signal.evidenceId || null });
    }
  }
  const ownerVerified = findings.some(x => x.type === 'verified_owner_or_agent');
  const status = severe ? 'HIGH_RISK' : suspicious ? 'SUSPICIOUS' : ownerVerified ? 'VERIFIED' : 'UNVERIFIED';
  return {
    status,
    sourceClass,
    scrutiny: source.scrutiny,
    findings,
    evidenceCount: evidence.length,
    disclaimer: 'Automated listing assessment; not a determination of fraud or a judgment about any person.'
  };
}

module.exports = { assessTrust, SOURCES };
