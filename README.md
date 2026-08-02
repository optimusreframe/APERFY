# APERFY

**A Perfect Find, For You.**

APERFY is a curated ecommerce storefront for real, limited-quantity products. It reuses the original React/Supabase foundation while replacing the inherited 3D-printing positioning with a general catalog, verified-value messaging and conversational order confirmation through WhatsApp.

## Local development

```bash
npm install --include=dev
copy .env.example .env.local
npm run dev
```

The public app needs a Supabase project configured through `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. No production secrets are committed.

## Validation

```bash
npm test
npm run build
npm run lint
```

The current repository contains legacy lint debt inherited from the source app. The APERFY files introduced in the rebrand pass ESLint without errors; the full legacy inventory is tracked for the next cleanup pass.

## Brand and commerce notes

- Official logo: `public/logo.png`; favicon/app icon: `public/favicon.png`.
- Design system: `docs/aperfy-design-system.md`.
- Price comparison is shown only when the reference price is valid and dated.
- Orders are created before WhatsApp handoff; online card/payment-provider checkout is intentionally not part of the storefront.
- Telegram notification and reservation enforcement require server-side Supabase Edge Functions and new APERFY credentials.
