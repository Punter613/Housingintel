# Source authorization assessment: OhioHousingLocator

- **Assessment date:** 2026-11-14
- **Determination:** MANUAL_ONLY (provisional; no affirmative automation authorization established)
- **Provider:** OhioHousingLocator.org; confirm exact contracting/data-rights entity before changing determination
- **Scope assessed:** Public rental-listing pages on OhioHousingLocator.org; no authorization inferred for third-party destinations or downstream redistribution
- **Method assessed:** Automated HTML collection and ingestion into HousingIntel review queue
- **Robots evidence:** User-supplied live retrieval on 2026-11-14:
  ```text
  User-agent: *
  Disallow:
  ```
  This indicates no path exclusions in the supplied robots response. Independently recheck at runtime. Robots is not a license or data-use authorization.
- **Terms / data-use evidence:** NOT YET REVIEWED. No affirmative automated collection, retention, or republication permission documented.
- **Source-stated rate limits:** NOT ESTABLISHED.
- **HousingIntel configured behavior:** Zero enabled source URLs and zero automated requests to this provider. A future candidate configuration may cap pages and use single-pass fetching, but those safeguards cannot create permission.
- **Operational verdict:** Do not activate this source. Obtain and review applicable terms/data policy and document affirmative permission or continue manual-only.
- **Evidence status:** Robots response is user-reported and quoted above; terms, permissions, and rate limits remain unverified.
- **Separate channel:** Saved-search email alerts require their own assessment; individual receipt does not authorize automated ingestion or republication.

## Required activation gate

Before enabling a URL, require a stored, dated determination of PERMITTED or PERMITTED_WITH_CONDITIONS; verify scope, permitted method, stated limits against actual configured limits, and evidence. Continue to check robots at fetch time. Fail closed on missing, expired, or inconsistent records. This document is an assessment, **not** an implemented runtime gate.
