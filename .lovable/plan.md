# Lock down `ai-product-import` to admin users

## Problem

`supabase/functions/ai-product-import/index.ts` currently has **no auth check at all**. Any caller with the project's anon key can:

- Pass `backgroundMode: "system_workshop"` + a `customBackground` URL → bypasses the official workshop reference and forces the model to composite an attacker-chosen image.
- Use `backgroundMode: "custom"` with any URL.
- Call `scrape`, `generate_image`, `generate_angle`, `translate`, `enhance_product` freely — burning LOVABLE_API_KEY credits and Firecrawl quota.

The function is only ever called from admin UI (`AdminProducts`, `AdminBackgroundQA`) and from `BulkImportContext` (also admin-only). So the right fix is to require an authenticated admin for the whole function, with extra strictness around the `customBackground` override.

## Plan

### 1. Add admin auth check at the top of every action

At the start of `serve(...)` (after CORS preflight), read the caller's JWT from the `Authorization` header and require:
- valid Supabase user (via `auth.getUser(token)` against `SUPABASE_URL` + `SUPABASE_ANON_KEY`)
- `user_roles` row with `role = 'admin'` for that `user_id` (using `SUPABASE_SERVICE_ROLE_KEY` over REST, same pattern already used for `admin_settings`)

If either check fails → return `401` (no token) or `403` (not admin) with `corsHeaders`. This blocks unauthenticated callers from every action, not only from the `customBackground` path.

### 2. Defense-in-depth for the `customBackground` override

Even after the admin gate, keep the existing behavior for `system_workshop`:
- If the (now-verified admin) caller passes `customBackground`, honor it.
- Otherwise resolve from `admin_settings.system_background` (already implemented).
- For `backgroundMode === "custom"`, `customBackground` remains required (existing 200+success:false error).

No prompt changes, no preset changes.

### 3. Keep `verify_jwt` behavior unchanged

Lovable-managed functions deploy with `verify_jwt = false` so we can validate in code (the pattern documented for this project). The new in-code check is what enforces auth — no `supabase/config.toml` change.

### 4. Frontend impact: none expected

`supabase.functions.invoke(...)` from `@/integrations/supabase/client` already attaches the logged-in user's JWT in the `Authorization` header automatically. All three current callers (`AdminProducts`, `AdminBackgroundQA`, `BulkImportContext`) run inside `/admin/*` routes, which are already protected by `ProtectedRoute requireAdmin`. So no client code needs to change — calls will continue to succeed for admins and start failing (correctly) for anon/non-admin callers.

### 5. QA after deploy

- From `/admin/background-qa` while logged in as admin → all 5 presets still work.
- A `curl` to the function endpoint with only the anon key → expect `401`.
- A `curl` with a non-admin user's JWT → expect `403`.

## Files touched

- `supabase/functions/ai-product-import/index.ts` — add admin-auth helper + early check in `serve`.

No UI, no DB migration, no prompt or preset changes.
