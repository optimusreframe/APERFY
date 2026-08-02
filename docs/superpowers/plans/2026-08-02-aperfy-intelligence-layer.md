# APERFY Intelligence Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vague APERFY storefront and inherited 3DtoPrint commercial language with a technology-led, evidence-first shopping experience that is branded APERFY end to end.

**Architecture:** Keep the existing Vite/React/Supabase boundaries. Add a focused signal-bench motion component, a data-safe copy/terminology layer, and small audit utilities rather than rewriting the whole app. Preserve existing order/cart behavior while removing obsolete public 3D-printing surfaces and payment-provider presentation.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, Framer Motion for existing UI transitions, GSAP + `@gsap/react` for the signal-bench timeline, Vitest, Supabase Edge Function templates.

## Global Constraints

- Official asset remains `public/brand/aperfy-logo.png`.
- Public copy must not mention 3DtoPrint, 3D printing, STL, filament, or print services.
- Keep `window.print()` and CSS `@media print` only when they are technical browser features.
- Do not fabricate testimonials, sales metrics, market references, product photography or customer logos.
- Orders are created before WhatsApp confirmation; no public online payment buttons.
- GSAP must use scoped `useGSAP`, transform/opacity properties, cleanup, and reduced-motion handling.
- No destructive Supabase migration.

---

### Task 1: Install runtime motion dependencies and establish audit tooling

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/lib/brand-audit.ts`, `src/lib/brand-audit.test.ts`

**Interfaces:**
- `findLegacyCommercialTerms(text: string): string[]`
- `isTechnicalPrintReference(text: string): boolean`

- [ ] **Step 1: Write the failing test** for detecting inherited commercial terms while allowing technical browser print references.
- [ ] **Step 2: Run `npm test src/lib/brand-audit.test.ts` and confirm the expected failure.**
- [ ] **Step 3: Install `gsap` and `@gsap/react`, then implement the smallest term scanner.**
- [ ] **Step 4: Run the focused test and full test suite.**
- [ ] **Step 5: Commit `chore: add APERFY audit and GSAP runtime`.**

### Task 2: Build the signal-bench visual primitive

**Files:**
- Create: `src/components/motion/SignalBench.tsx`
- Create: `src/components/motion/SignalBench.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Props: `{ locale: 'en' | 'es'; reducedMotionLabel: string; className?: string }`
- Accessible output includes a labelled region, signal status text, and non-animated fallback.

- [ ] **Step 1: Write a failing render test** asserting the signal bench has an accessible label and APERFY-specific status text.
- [ ] **Step 2: Run the focused test and confirm it fails because the component is absent.**
- [ ] **Step 3: Implement SVG/canvas-free signal geometry with a graticule, trace path, readout labels and a visually-hidden text equivalent.**
- [ ] **Step 4: Add `useGSAP` timeline with labels `noise`, `lock`, `signal`, scoped cleanup, and `gsap.matchMedia()` reduced-motion branch.**
- [ ] **Step 5: Run focused test, then inspect desktop/mobile rendering in the local browser.**
- [ ] **Step 6: Commit `feat: add APERFY signal bench motion`.**

### Task 3: Replace the homepage with the full Intelligence Layer composition

**Files:**
- Modify: `src/pages/Index.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: `src/components/ProductCard.tsx`
- Create: `src/components/landing/SignalRail.tsx`
- Create: `src/components/landing/TrustInstrumentation.tsx`
- Create: `src/components/landing/FindNarrative.tsx`

**Interfaces:**
- `SignalRail` consumes the active locale and renders four product truth stages.
- `TrustInstrumentation` consumes locale and renders three compact proof statements.
- `FindNarrative` consumes locale and renders sourced/check/list/confirm copy.

- [ ] **Step 1: Add failing tests** for stage labels, no-printing copy, and localized hero content.
- [ ] **Step 2: Run focused tests and confirm failures.**
- [ ] **Step 3: Implement the hero, signal bench, stage rail, trust instrumentation and editorial catalog sections with real Supabase products.**
- [ ] **Step 4: Remove generic eyebrow/number/card scaffolding and ensure focus/hover/empty/loading states.**
- [ ] **Step 5: Run tests and browser checks at desktop and mobile widths.**
- [ ] **Step 6: Commit `feat: redesign APERFY storefront experience`.**

### Task 4: Complete the commercial terminology migration

**Files:**
- Modify: `src/App.tsx`, `src/i18n/translations.ts`, `src/i18n/LanguageContext.tsx`, `src/pages/Auth.tsx`, `src/pages/Checkout.tsx`, `src/pages/Catalog.tsx`, `src/pages/ProductDetail.tsx`, `src/pages/OurProcess.tsx`, `src/pages/Materials.tsx`, `src/pages/RequestModel.tsx`
- Modify: `supabase/functions/_shared/email-templates/*.tsx`
- Modify: `supabase/functions/_shared/transactional-email-templates/*.tsx`
- Modify: `supabase/functions/send-transactional-email/index.ts`
- Modify: `README.md`, `index.html`, `public/manifest.webmanifest`
- Create: `docs/audits/aperfy-legacy-content-audit.md`

- [ ] **Step 1: Produce the audit report with file-level categories and explicit technical false positives.**
- [ ] **Step 2: Replace public brand/domain/copy references using APERFY terminology.**
- [ ] **Step 3: Redirect public legacy routes to `/catalog` or product routes and remove obsolete public nav destinations.**
- [ ] **Step 4: Rename email/site branding and disable source-only 3D email templates from the active registry without deleting migrations.**
- [ ] **Step 5: Run the scanner, review every remaining match, and add tests for the allowed technical cases.**
- [ ] **Step 6: Commit `refactor: remove inherited 3D printing storefront language`.**

### Task 5: Harden theme, motion, responsive and content states

**Files:**
- Modify: `src/index.css`, `src/App.css`, `src/components/ui/*` only where needed for focus/contrast
- Modify: `src/components/CartAddedToast.tsx`, `src/pages/NotFound.tsx`, `src/pages/Cart.tsx`, `src/pages/Orders.tsx`
- Create: `docs/audits/aperfy-visual-audit.md`

- [ ] **Step 1: Add failing tests for locale fallback, reduced-motion classes and empty catalog state.**
- [ ] **Step 2: Implement system/light/dark behavior without flashes and keep controls at 44px minimum touch targets.**
- [ ] **Step 3: Add explicit loading, error, empty, disabled and success states using APERFY copy.**
- [ ] **Step 4: Run the mechanical Impeccable detector once on changed UI targets.**
- [ ] **Step 5: Run desktop/mobile browser checks and document findings.**
- [ ] **Step 6: Commit `polish: harden APERFY responsive experience`.**

### Task 6: Final verification and publish

**Files:**
- Modify: `docs/audits/aperfy-legacy-content-audit.md`, `docs/audits/aperfy-visual-audit.md` as evidence requires

- [ ] **Step 1: Run `npm test`.**
- [ ] **Step 2: Run targeted ESLint and record inherited global lint debt separately.**
- [ ] **Step 3: Run `npm run build`.**
- [ ] **Step 4: Run the legacy-term scanner and mechanical detector.**
- [ ] **Step 5: Run browser smoke checks for homepage, catalog, cart and checkout entry.**
- [ ] **Step 6: Use finishing-a-development-branch, commit remaining evidence, push, open PR and merge.**
