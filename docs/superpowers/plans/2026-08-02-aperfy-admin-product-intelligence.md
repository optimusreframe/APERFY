# APERFY Admin Product Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every admin route feel like the APERFY macOS console and replace the inherited 3D-print product workflow with generic retail product intelligence.

**Architecture:** Harden the shared admin shell first, then update product copy/variant semantics, then add the AI photo/market-reference boundary and settings UI. Existing Supabase tables remain compatible; new behavior is layered through edge-function actions and admin settings.

**Tech Stack:** React, TypeScript, Tailwind, shadcn/ui, Framer Motion, TanStack Query, Supabase Edge Functions, Vitest, Vite.

## Global Constraints

- APERFY is always uppercase in admin chrome and product workflow labels.
- Dark graphite macOS surfaces are the default; APERFY green is reserved for active state and primary action.
- “Materials” is not a visible concept; the UI calls reusable values “Variants”.
- No 3D-print, printer, filament, or printing copy remains in the admin workflow.
- Provider secrets are Edge Function secrets and never browser-readable.
- Market discount defaults to 20% and is configurable by an admin.

### Task 1: Shared APERFY admin shell

**Files:**
- Modify: `src/pages/admin/AdminLayout.tsx`
- Modify: `src/pages/admin/AdminSidebar.tsx`
- Modify: `src/pages/admin/_shared.tsx`
- Modify: `src/pages/admin/AdminDashboard.tsx`
- Modify: `src/pages/admin/AdminAI3DSettings.tsx` (replace with AI provider settings)

- [ ] Update route labels, shell title, status copy, and sidebar groups to uppercase APERFY language.
- [ ] Use shared dark graphite surfaces, focus rings, and fixed internal scrolling across admin pages.
- [ ] Rename the AI settings route label and page to AI Product Intelligence.
- [ ] Verify all touched pages compile and render the same shell primitives.

### Task 2: Variants and product workflow

**Files:**
- Modify: `src/pages/admin/AdminMaterials.tsx` (visible Variants page)
- Modify: `src/pages/admin/AdminProducts.tsx`
- Modify: `src/components/admin/MarginCalculator.tsx`
- Modify: `src/App.tsx`

- [ ] Add `/admin/variants` and redirect the legacy `/admin/materials` path.
- [ ] Replace visible Materials labels and cost-per-kg/printing copy with generic variant preset copy.
- [ ] Remove 3D fields from product create/edit UI and rename variation controls to generic variant attributes.
- [ ] Add default market discount input and generic suggested-price preview to AI review/product pricing.
- [ ] Validate URL import, photo upload/camera capture, create, edit, and variant persistence paths.

### Task 3: AI product intelligence boundary

**Files:**
- Modify: `supabase/functions/ai-product-import/index.ts`
- Create: `supabase/functions/ai-product-from-photo/index.ts`
- Modify: `src/pages/admin/AdminProducts.tsx`
- Modify: `src/contexts/BulkImportContext.tsx`

- [ ] Replace 3D-specific background prompts with APERFY retail photography prompts.
- [ ] Add structured `analyze_photo` response with product identity, market reference, and suggested price.
- [ ] Add photo input with `capture="environment"` and library fallback.
- [ ] Add missing-credential and provider-error states.
- [ ] Add focused unit coverage for price suggestion and prompt contracts.

### Task 4: Verification and delivery

**Files:**
- Test: `src/lib/product-intelligence.test.ts`
- Modify: `src/lib/brand-audit.ts` if needed

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check` and a route/copy audit with `rg`.
- [ ] Commit, push, open PR, merge, and report required Supabase secrets and deployment steps.
