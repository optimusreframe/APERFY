# APERFY Admin Product Intelligence Design

## Goal

Convert the admin console from its inherited 3D-print workflow into a consistent APERFY macOS console for general retail products, while adding a safe foundation for AI-assisted product creation from URLs and photos.

## Scope

- Apply one dark graphite APERFY shell to every admin route and modal.
- Use uppercase APERFY product language throughout the admin shell and product workflow.
- Rename the visible Materials area to Variants. Keep the existing `materials` database table as a compatibility layer, but expose its records as reusable variant presets.
- Remove 3D-print assumptions from product import, variant editing, margin copy, and background generation prompts.
- Add AI Import Studio source modes for URL and product photo, with a review step that can return identity, market reference, and suggested price.
- Add admin AI settings for provider, model, vision/search enablement, and the configurable default discount (20%). Store secret values in Supabase Edge Function secrets, never in browser-readable settings.

## Architecture

Shared admin styling lives in `AdminLayout`, `AdminSidebar`, and `_shared.tsx`; individual pages inherit the shell and use graphite surfaces. Product intelligence is exposed through `ai-product-import` actions (`scrape`, `analyze_photo`, `generate_image`, `translate`, `enhance_product`, and background generation). The client only sends user input and reads structured results; provider credentials stay server-side.

The photo workflow uses a progressive enhancement boundary: it can accept a camera capture or photo-library upload immediately, then calls the edge function when vision/search credentials are configured. If they are not configured, the review UI reports the missing configuration instead of pretending to have market data.

## Product data behavior

- A URL import enriches the product from the supplied product page.
- A photo import analyzes packaging, labels, visible model numbers, brand, and product attributes, then optionally searches configured market sources.
- Suggested price is `market_reference_price * (1 - discount_percent / 100)`, with 20% as the default.
- Variant rows use generic types such as color, size, capacity, storage, finish, pack, and custom. Legacy `material_id` is retained only for database compatibility and is not shown as a product concept.
- Generated backgrounds describe clean APERFY retail/product photography: graphite surfaces, soft neutral gradients, controlled green accents, and enough negative space for the product. No printer, filament, maker-lab, or 3D language.

## Security

- Admin settings can store non-secret configuration and a masked secret status.
- Provider API keys are read by Edge Functions from `AI_PROVIDER_API_KEY`, `AI_SEARCH_API_KEY`, or provider-specific secrets.
- The frontend must never render or persist raw provider secrets.
- Admin-only writes continue to use existing RLS policies.

## Acceptance criteria

1. Every admin route uses the dark APERFY macOS shell and uppercase route labels.
2. No visible admin navigation or product workflow says Materials, 3D, printer, filament, or printing.
3. `/admin/variants` is the visible replacement for `/admin/materials`.
4. AI Import Studio supports URL, photo capture/library, and review states without exposing credentials.
5. Product create/edit exposes generic variants and a 20% configurable market discount.
6. Tests and production build pass.
