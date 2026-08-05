# APERFY macOS Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every APERFY route feel like one polished macOS/iOS app with restrained Apple motion, selective futuristic depth, and an accessible APERFY cursor glow.

**Architecture:** Reuse the existing `MacAppShell`, `PageTransition`, `PointerGlow`, Tailwind tokens, and Framer Motion. Add only the smallest shared primitives needed for global app motion and apply route-specific classes where the current pages already expose surfaces. Keep the outer window fixed and the inner viewport as the only scroll region.

**Tech Stack:** React, TypeScript, Framer Motion, Tailwind CSS, Vitest, Vite.

## Global Constraints

- Use `#22C55E`/existing APERFY green for action and verified-value states.
- Preserve readable contrast and visible keyboard focus.
- Preserve minimum 44px touch targets.
- Use CSS transitions for 120–220ms micro states and Framer Motion for 180–320ms entrances/layout transitions.
- Respect `prefers-reduced-motion` and never hide critical content behind animation.
- Do not add a new animation dependency.
- Keep the window static; only the inner app viewport scrolls.

---

### Task 1: Establish the shared APERFY macOS motion contract

**Files:**
- Modify: `src/components/layout/MacAppShell.tsx`
- Modify: `src/components/motion/PageTransition.tsx`
- Modify: `src/components/motion/PointerGlow.tsx`
- Test: `src/components/layout/MacAppShell.test.tsx`
- Test: `src/components/motion/PointerGlow.test.tsx`

- [ ] Add/adjust tests for the shared shell landmarks, reduced-motion behavior, and pointer glow being non-interactive.
- [ ] Run the focused tests and confirm they fail for the missing contract.
- [ ] Reuse existing shell/motion components; keep `PointerGlow` desktop-only and disable it for touch/reduced-motion.
- [ ] Add the minimal shared classes/data attributes needed for route styling and reduced-motion selectors.
- [ ] Run focused tests, then the full test suite.
- [ ] Commit `feat: establish aperfy macos motion contract`.

### Task 2: Polish global window, toolbar, surfaces, and focus states

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/layout/MacAppShell.tsx`
- Test: `src/components/layout/MacAppShell.test.tsx`

- [ ] Add failing assertions for static-window geometry, inner-scroll ownership, visible focus, and reduced-motion CSS.
- [ ] Run the focused test to confirm the assertions fail.
- [ ] Consolidate the APERFY macOS shell styles in the existing CSS without introducing a second design system.
- [ ] Ensure glass surfaces remain legible and controls keep focus rings and 44px targets.
- [ ] Run focused tests and `git diff --check`.
- [ ] Commit `feat: polish aperfy macos shell surfaces`.

### Task 3: Apply motion hierarchy to storefront routes

**Files:**
- Modify: `src/pages/Index.tsx`
- Modify: `src/pages/ProductDetail.tsx`
- Modify: `src/pages/Cart.tsx`
- Modify: `src/pages/Checkout.tsx`
- Modify: `src/pages/RequestModel.tsx`
- Test: `src/pages/Index.test.tsx`

- [ ] Add/adjust tests for APERFY storefront labels and stable content visibility.
- [ ] Run the focused tests before implementation.
- [ ] Add only selective motion: product reveal, filter/layout transitions, cart feedback, checkout step transitions, and modal entry.
- [ ] Keep purchase actions visually dominant and avoid animation around validation errors.
- [ ] Verify reduced-motion behavior through the shared motion contract.
- [ ] Run focused tests and the full suite.
- [ ] Commit `feat: apply aperfy macos storefront motion`.

### Task 4: Apply Settings-style motion to account and admin routes

**Files:**
- Modify: `src/pages/Profile.tsx`
- Modify: `src/pages/Auth.tsx`
- Modify: `src/pages/Contact.tsx`
- Modify: `src/pages/admin/AdminLayout.tsx`
- Modify: `src/pages/admin/AdminDashboard.tsx`
- Modify: `src/pages/admin/AdminProducts.tsx`
- Modify: `src/pages/admin/AdminMaterials.tsx`
- Modify: `src/pages/admin/AdminAISettings.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Test: `src/components/layout/MacAppShell.test.tsx`

- [ ] Add focused assertions for admin shell landmarks and APERFY macOS labels.
- [ ] Run tests before implementation.
- [ ] Apply compact Settings-like grouping to profile/admin surfaces and consistent dialog entry/exit states.
- [ ] Preserve sidebar geometry and make only the content viewport scroll.
- [ ] Keep dialogs keyboard accessible with focus-visible states and reduced-motion fallbacks.
- [ ] Run full tests and production build.
- [ ] Commit `feat: unify aperfy macos account and admin surfaces`.

### Task 5: Browser audit and release validation

**Files:**
- No production file changes unless validation exposes a defect.

- [ ] Start the local dev server and audit `/`, a product route, `/cart`, `/checkout`, `/profile`, `/ask`, `/contact`, `/admin`, `/admin/products`, and `/admin/ai-settings`.
- [ ] Capture desktop and mobile screenshots for the shell, storefront, profile, and admin.
- [ ] Verify content scroll does not resize or detach the app window/sidebar.
- [ ] Verify cursor glow does not intercept clicks and disappears/reduces for touch/reduced-motion.
- [ ] Run `npm test -- --run`, `npm run build`, `npm run lint`, and `git diff --check`.
- [ ] Commit any final fix separately, then push, open PR, and merge.
