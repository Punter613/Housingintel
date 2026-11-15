# Source authorization assessment: OhioHousingLocator

- **Assessment date:** 2026-11-14
- **Determination:** MANUAL_ONLY (terms reviewed; restrictions on nonpersonal copying, storage, and redistribution; no written consent documented)
- **Provider:** OhioHousingLocator.org, whose listings are handled by MyHousingSearch.com; Ohio site identifies Emphasys Software as platform operator. Confirm the entity empowered to grant written consent before changing determination
- **Scope assessed:** Public rental-listing pages on OhioHousingLocator.org; no authorization inferred for third-party destinations or downstream redistribution
- **Method assessed:** Automated HTML collection and ingestion into HousingIntel review queue
- **Robots evidence:** Retrieved live by the reviewing agent from ohiohousinglocator.org on 2026-11-14:
  ```text
  User-agent: *
  Disallow:
  ```
  This indicates no path exclusions in the retrieved robots response. Independently recheck at runtime. Robots is not a license or data-use authorization.
- **Terms / data-use evidence:** REVIEWED on 2026-11-14. MyHousingSearch.com Terms of Use, §2 SITE CONTENT, https://www.myhousingsearch.com/TermsOfUse.html?ch=HOF (site-wide scope text includes pages linked through partner sites). §2 restricts publication, reproduction, distribution, and exploitation of Content; allows copying for personal use only; prohibits storage of a significant portion; and requires prior written consent from MyHousingSearch.com or the identified copyright holder for copying or storage beyond personal, noncommercial use. The terms also separately restrict paid redistribution and framing. HousingIntel's proposed automated collection, database retention, and dashboard redisplay are not authorized by these published terms. Source terms last labeled updated 2012-11-19; recheck before any change of status. Supporting Ohio-specific platform linkage: https://www.myhousingsearch.com/Privacy.html?ch=OH and https://www.ohiohousinglocator.org/About.html. No written consent on file.
- **Source-stated rate limits:** NOT ESTABLISHED.
- **HousingIntel configured behavior:** Zero enabled source URLs and zero automated requests to this provider. A future candidate configuration may cap pages and use single-pass fetching, but those safeguards cannot create permission.
- **Operational verdict:** Do not activate this source. Obtain explicit prior written consent covering automated collection, retention, and redisplay (and any conditions), or keep MANUAL_ONLY. An unanswered request is not consent.
- **Evidence status:** Robots response retrieved live by the reviewing agent; applicable MyHousingSearch terms reviewed and linked above; published restrictions identified. Written permission absent; provider-specific request frequency/rate terms not established.
- **Separate channel:** Saved-search email alerts require their own assessment; individual receipt does not authorize automated ingestion or republication.

## Required activation gate

The deployed collector checks for a stored, dated, unconditional PERMITTED record covering the configured URL, method, evidence, and page caps **before any robots or listing fetch**. PERMITTED_WITH_CONDITIONS and unknown/unsupported restrictions are rejected. Robots is checked separately at runtime. No authorization record exists for this source; the registry and enabled pages remain empty. The human evidence review must establish that all applicable terms are captured; the code cannot detect omitted restrictions.
