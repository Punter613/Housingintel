# Multi-page rental collection

HousingIntel's existing GitHub Actions schedule runs every six hours. It reads `config/sources.json` and visits only entries explicitly marked `enabled: true`.

Example configuration (illustrative only; not an approved or enabled source):

```json
{
  "pages": [
    {
      "url": "https://example.org/rentals",
      "enabled": false,
      "detailPathContains": "/rentals/",
      "maxDetails": 8
    }
  ]
}
```

The collector checks robots.txt for both the starting URL and each discovered detail URL. It does not log in, bypass 403 responses, follow cross-domain detail links, or use paid APIs. Enable a real source only after confirming its access terms permit automated collection. Site terms may impose restrictions beyond robots.txt.

Only JSON-LD property records containing a full Ohio street address, city, ZIP and compatible property type are saved. Rent, bedrooms, and voucher acceptance remain unknown unless explicitly supported; voucher acceptance is never inferred from a listing. The dashboard reads collected records from Neon.

This is a bounded, conservative collector, **not** a general-purpose JavaScript-rendered site scraper. It will not extract data from sites that provide only client-side content or incompatible HTML. The current source configuration is intentionally empty pending verified permitted targets.

To test: `npm test`. To collect: set the existing `DATABASE_URL` secret and run the HousingIntel collection GitHub Action.
