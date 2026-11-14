# HousingIntel

Standalone, private housing-search and voucher eligibility project. Not connected to SKSK ProTech.

## Mission
Find and track rental candidates across multiple permitted sources, preserve listing provenance, and prioritize affordable move-in costs for people using Housing Choice Vouchers.

## Rules
- A listing is **UNVERIFIED** until directly confirmed by a landlord or authoritative source.
- Gross rent = contract rent + the housing authority's utility allowance for tenant-paid utilities.
- Never mark PASS if utility responsibility or the applicable allowance is unknown.
- FAIL properties remain archived with reason and evidence.
- Never assume an advertised "Section 8 OK" means a landlord accepts a specific housing authority's tenant-based voucher.
- Avoid publishing applicant personal data or credentials.

## Initial profile configuration
See `config/profiles.example.json` for a **non-personal** example. Faye's actual profile and documents must be stored securely outside the repository.

## Roadmap
1. Generic applicant profile form and persistent secure storage.
2. Source-specific adapters for permitted rental feeds and listing pages.
3. Normalization, provenance, deduplication, photo references, and listing history.
4. Housing-authority utility allowances and strict eligibility calculations.
5. Human landlord-verification log, RTA/inspection tracking, cash-at-move-in ranking.
6. Mobile dashboard, scheduled reports, and deadline alerts.

## Status
Repository initialized. This README is a project specification, not evidence that a live scraper or dashboard has been deployed.
