# Background Studio — Error Handling, Composed Results & Reuse

A focused extension of `/admin/background-qa` and the `ai-product-import` edge function. Strictly admin-scoped. No changes to public storefront, cart, checkout, or existing product import logic except adding a new image source ("Composed Results") in the product image picker.

## 1. Backend / Database

**New table** `public.background_composition_results`
- `id`, `source_image_url`, `background_image_url`, `composed_image_url`
- `background_candidate_id` (nullable)
- `method` text: `ai` | `safe_retry` | `non_ai`
- `preset` (nullable), `product_id` (nullable), `notes` (nullable)
- `created_by`, `created_at`
- RLS: admin-only (manage), `service_role` full. GRANTs for `authenticated` + `service_role`.

**Storage**
- Reuse existing `product-images` bucket; write to path `composed-results/{userId}/{timestamp}-{method}-{preset}.png`. Avoids a new bucket and inherits existing admin RLS.

## 2. Edge Function (`ai-product-import`)

In the `compose_product_on_background` action (and equivalent):

- Detect safety/block errors from the AI gateway. Match on `prohibited`, `safety`, `content policy`, `blocked`, `unsafe`, `moderation`, `rejected`, HTTP 400/422 with content-block markers.
- Return HTTP 200 with structured payload:
  ```
  { success: false, error_code: "AI_CONTENT_BLOCKED",
    message: "...", can_retry_safe: true, can_use_non_ai_fallback: true }
  ```
- Accept optional `safeRetry: true` in payload. When true, use the neutral prompt provided in the spec (no IP/character/brand references; only placement/lighting/shadow guidance).
- On successful AI/Safe-Retry composition, upload the resulting PNG to `product-images/composed-results/...` and insert a row into `background_composition_results` with method `ai` or `safe_retry`. Return `composed_image_url` + result row id.
- Keep existing admin auth (`requireAdmin`).

## 3. Non-AI Composite (frontend canvas)

Implemented client-side via HTML Canvas (Sharp not viable in Deno edge runtime):
- Load background and source image (with CORS).
- Draw background → draw source centered with `productSize` (small/medium/large), `verticalPosition` (lower/center/higher), and optional soft/strong drop shadow.
- Export PNG via `canvas.toBlob`, upload to `product-images/composed-results/...`, insert DB row with method `non_ai`.
- Badge "Non-AI Preview" + note "This is a simple preview composite. AI lighting integration was not used."

## 4. UI — `AdminBackgroundQA.tsx`

**Preview with Product modal**
- Keep existing `ProductImageSourcePicker` (Library / Upload / URL).
- `Run Composition` disabled until valid `sourceImage`.
- On `AI_CONTENT_BLOCKED` response → show panel with:
  - "AI composition was blocked" + descriptive message
  - Buttons: **Try Safe Retry**, **Use Non-AI Composite**, **Choose Another Image**
- On generic failure → clear error + retry, log full payload to console.
- On success → show composed result + method badge (AI / Safe Retry / Non-AI) and actions: **Download**, **Save to Product Image Library**, **Copy URL**.
- Replace old Spanish blocked toast with the new message.

**Generated Background Variants cards**
- Add **Download Background** (fetch original storage URL, save as `3dtoprint-background-{preset}-{timestamp}.png`), **Copy URL**, **Open in new tab**. Keep existing Preview / Regenerate / Set as Official / Delete.

**New section: Saved Composed Results**
- Grid: thumbnail, method badge, preset, date, source product (if any), background.
- Actions: Download, Copy URL, Use for Product (navigate to product editor pre-loading the image), Delete.
- Filter by method/preset, simple text search.

**Preset QA Runner**
- Each result card: Download, Save to Composed Results, Copy URL.
- Same AI_CONTENT_BLOCKED panel on failure (per preset).

## 5. Product Image Picker — Compose Results tab

Extend `ProductImageSourcePicker` with a 4th tab "Composed Results" (admin-only context):
- Lists rows from `background_composition_results` (filter by method/preset).
- "Use this image" returns the `composed_image_url`.
- Surface available wherever the picker is used (Background QA modal + future product create/edit usage).

## 6. Validation & Security

- All new endpoints/UI behind `requireAdmin` (route + edge).
- Uploads: only `image/*`, max 10MB, extensions PNG/JPG/JPEG/WEBP, clear errors.
- New table RLS: admin-only.

## 7. Out of Scope (explicitly preserved)

- Public storefront, cart, checkout, product grid.
- Existing AI background generator & "Set as Official" flow.
- Existing bulk import logic (only adds optional Composed Results source if/when the picker is used there — no behavioral change otherwise).
- Anything to do with bypassing AI filters.

## Files Touched

- New migration: create `background_composition_results` + GRANTs + RLS.
- `supabase/functions/ai-product-import/index.ts`: block detection, `safeRetry`, upload + DB insert on success.
- `src/pages/admin/AdminBackgroundQA.tsx`: blocked panel, action buttons, Saved Composed Results section, background download/copy.
- `src/components/admin/ProductImageSourcePicker.tsx`: new "Composed Results" tab.
- New `src/lib/non-ai-composite.ts`: canvas-based composer + uploader helper.

## Acceptance (matches spec A–H)

Standard products compose & save; blocked products surface the panel with the three options; Safe Retry uses the neutral prompt; Non-AI Composite works on iPad; backgrounds download at full quality; Composed Results are reusable in product flows; auth boundaries (401/403/admin OK) preserved.
