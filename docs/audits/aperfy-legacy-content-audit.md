# APERFY legacy-content audit

Date: 2026-08-02

## Outcome

The public APERFY experience now speaks in terms of curated finds, useful product details, verified value, limited availability, discovery and WhatsApp confirmation. The homepage, catalog, product detail, checkout, auth, referrals, mobile navigation, process and value-signal pages no longer present 3D printing as the product proposition.

## Migration coverage

- Replaced inherited storefront copy in English and Spanish.
- Added canonical `/products/:slug` support while preserving `/3dmodels` as a compatibility redirect.
- Added `/request-product` while preserving `/request-model` for existing links.
- Removed the unused 3D splash loader from the application shell.
- Reframed the former Materials page as APERFY value signals.
- Reframed the former Process page as APERFY discovery and confirmation flow.
- Updated sharing, referrals, catalog and mobile navigation language.
- Added a brand audit scanner with tests for legacy commercial terms and legitimate browser print APIs.

## Intentional technical exceptions

The database schema and a small set of admin/source-only tools still contain compatibility identifiers such as `model_3d_url`, `model_requests`, `ai-3d` and historical migration names. They are not part of the public storefront copy and were not renamed because doing so would require a coordinated Supabase migration and could break existing data. The legacy AI importer functions are source-only and must remain disabled or be re-scoped before production use.

`window.print()` and `@media print` are browser capabilities, not APERFY positioning, and are explicitly allowed by the scanner.

## Follow-up before production

1. Migrate Supabase schema names only after the APERFY database is provisioned and backed up.
2. Remove or re-scope the legacy 3D AI functions before enabling admin automation.
3. Run a final authenticated admin audit after Supabase and Vercel environment variables are connected.
