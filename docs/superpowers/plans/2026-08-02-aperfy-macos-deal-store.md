# APERFY macOS Deal Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Replace the abstract APERFY signal experience with a dark-first, hybrid macOS-style technology store centered on available big deals and limited stock.

**Architecture:** Keep the current React/Vite/Supabase storefront and existing GSAP + Framer Motion stack. Add a reusable macOS application shell around public routes, consolidate canonical logo/favicon assets, move commerce copy into direct bilingual strings, and add bounded motion with reduced-motion fallbacks.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Framer Motion, GSAP, Vitest, Supabase product data, PWA manifest.

## Global Constraints

- Dark mode is the default; preserve the existing APERFY green identity.
- `public/logo.png` is the sole website logo asset.
- `public/favicon.png` is the sole favicon, Apple touch icon and PWA icon asset.
- Public copy uses big deals, available products, limited stock and wholesale value; do not use Signal terminology.
- Never invent discounts, market prices or stock guarantees.
- The checkout and order-first flow remain functional.
- All motion must have a `prefers-reduced-motion` fallback and avoid layout-property animation.

---

### Task 1: Canonicalize logo and browser assets

**Files:**
- Modify: `index.html`
- Modify: `public/manifest.webmanifest`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: `src/pages/Auth.tsx`
- Modify: `src/pages/admin/AdminSidebar.tsx`
- Modify: `src/pages/admin/AdminLayout.tsx`
- Verify: `public/logo.png`, `public/favicon.png`

- [ ] Replace every visual logo source with `/logo.png`.
- [ ] Replace favicon, Apple touch icon and manifest icon entries with `/favicon.png`.
- [ ] Remove stale `/brand/aperfy-logo.png`, `/favicon-32.png`, `/apple-touch-icon.png` references from active code.
- [ ] Preserve APERFY alt text and accessible labels.
- [ ] Run `rg -n "brand/aperfy|favicon-32|apple-touch|logo\.png|favicon\.png" index.html public src` and verify only canonical paths remain.

### Task 2: Build the macOS app shell

**Files:**
- Create: `src/components/layout/MacAppShell.tsx`
- Create: `src/components/layout/MacAppShell.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`

- [ ] Add a responsive shell with workspace backdrop, title bar, traffic-light controls, sidebar navigation and content region.
- [ ] Hide decorative desktop chrome below the mobile breakpoint while retaining the same content hierarchy.
- [ ] Use semantic landmarks and keyboard-focusable navigation.
- [ ] Add a failing test for `APERFY Store`, `Available now` navigation and mobile-safe content.
- [ ] Run the focused test red, implement, then run it green.

### Task 3: Replace signal language with deal-store language

**Files:**
- Modify: `src/pages/Index.tsx`
- Modify: `src/i18n/translations.ts`
- Modify: `src/components/motion/SignalBench.tsx`
- Modify: `src/components/landing/SignalRail.tsx`
- Modify: `src/components/landing/FindNarrative.tsx`
- Modify: `src/components/landing/HeroBanner.tsx`
- Modify: `src/pages/Materials.tsx`
- Modify: `src/pages/OurProcess.tsx`
- Tests: related homepage and motion tests.

- [ ] Rename components or public labels away from Signal without breaking imports unnecessarily.
- [ ] Set hero copy to “Big deals. Small quantities.” with Spanish equivalent.
- [ ] Explain wholesale/big-deal sourcing, daily additions and limited availability.
- [ ] Show current product data as the first meaningful content after the app header.
- [ ] Keep price/reference claims conditional on existing product data.
- [ ] Add tests asserting no public homepage copy contains `/signal/i` and that deal-store copy exists in both locales.

### Task 4: Add macOS-native motion and pointer behavior

**Files:**
- Create: `src/components/motion/MacWindowIntro.tsx`
- Create: `src/components/motion/PointerGlow.tsx`
- Create: focused tests for reduced-motion behavior.
- Modify: `src/index.css`
- Modify: `src/pages/Index.tsx`

- [ ] Use Framer Motion for shell entry and section reveals.
- [ ] Use GSAP/ScrollTrigger only for bounded hero/deal parallax where it adds real value.
- [ ] Add pointer glow only for fine pointers; mark it decorative and disable it for reduced motion.
- [ ] Animate transform, opacity, clip-path or shadow; never animate width/height/margin/padding.
- [ ] Test reduced-motion and keyboard focus states.

### Task 5: Visual validation and hardening

**Files:**
- Modify: `docs/superpowers/specs/2026-08-02-aperfy-macos-deal-store-design.md` only if implementation decisions change.
- Create/update: `DESIGN.md` from the shipped visual world.

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Run one Impeccable detector pass on changed UI files and fix mechanical findings.
- [ ] Use the live browser at `http://127.0.0.1:8080/` to inspect desktop and mobile composition.
- [ ] Verify logo DOM sources, favicon metadata, no signal copy, reduced-motion branch and responsive shell.
- [ ] Commit, push, create PR and merge after fresh verification.
