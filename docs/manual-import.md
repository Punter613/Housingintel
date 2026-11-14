# Reviewed listing imports

HousingIntel supports a source-independent JSON importer for listings manually reviewed on official housing locators and rental sites. This does not automate access to third-party websites.

Prepare a local JSON file containing an array of records with:
- `source`: one of `ohio_housing_locator`, `affordablehousing`, `tmha`, `zillow`, `apartments`, `manual_other`
- `sourceId`: stable ID from the original listing; if unavailable, assign and consistently reuse an internal review ID
- `source_url`: the original public listing URL
- `address`, `city`, `state` (OH), `zip`
- Optional: `unit`, `multiUnit`, `bedrooms`, `rent`, `availability`, `evidenceNotes`, `capturedAt`, `sourceClaims`

Example (fictional; do not import as a real property):
```json
[{"source":"ohio_housing_locator","sourceId":"EXAMPLE-ONLY","source_url":"https://www.ohiohousinglocator.org/","address":"123 Example St","city":"Warren","state":"OH","zip":"44481","bedrooms":1,"rent":700,"evidenceNotes":"EXAMPLE ONLY"}]
```

Run `node src/import-listings.js reviewed.json` for a validation-only dry run.
Run `node src/import-listings.js reviewed.json --commit` only from a trusted environment with `DATABASE_URL` configured to store records in Neon.

Imported records are always marked unverified for address matching, voucher acceptance and utility allowance. They do **not** automatically pass the $771 gross-rent rule. Store only listing data, never voucher holders' personal information. Never commit actual reviewed imports containing private contact information or credentials.

**Current limitations:** no upload UI, no automatic approved feed, no production import execution verified yet. Database writes are per-record, not an all-or-nothing batch.
