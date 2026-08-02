# APERFY Home Store and Route Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert APERFY into a direct home storefront with one catalog, a separate `/ask` request flow, product detail, checkout, contact, and admin routes.

**Architecture:** Keep `MacAppShell` as the global visual boundary. Make `Index` the only customer-facing catalog surface, using the existing product query and extending its local filtering controls. Replace legacy public catalog/process links with redirects or the new `/ask` and `/contact` destinations, while preserving product, checkout, WhatsApp, authentication, and admin behavior.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, Tailwind CSS, Framer Motion, GSAP, Vitest, Vite.

## Global Constraints

- The home route `/` is the only customer-facing catalog.
- `/ask` remains available for product requests and notification follow-up.
- Preserve the macOS glass shell, graphite dark palette, APERFY green, logo, favicon, and fixed-window/internal-scroll behavior.
- Do not remove product detail, checkout, WhatsApp ordering, admin, or required authentication routes.
- Do not promise permanent stock; communicate real and limited availability.

### Task 1: Update storefront copy and home information architecture

**Files:**
- Modify: `src/pages/homepage-copy.ts`
- Modify: `src/pages/Index.tsx`
- Modify: `src/pages/Index.test.tsx`

**Interfaces:**
- `getHomepageCopy(language)` continues returning `HomepageCopy`.
- `Index` remains the route component for `/` and continues consuming the active-products query.

- [ ] **Step 1: Write failing copy assertions**

Add assertions that Spanish copy contains the new price/value promise, does not contain “Cantidades pequeñas”, and labels the secondary action as a product request rather than “Cómo funciona”.

- [ ] **Step 2: Run the focused test and verify failure**

Run `npm test -- --run src/pages/Index.test.tsx`. Expected: the old copy fails the new assertions.

- [ ] **Step 3: Implement the new copy and home structure**

Use Spanish copy centered on “Grandes ofertas a precios que sorprenden” and an equivalent English translation. Remove the editorial hero panel and process CTA. Keep the macOS motion wrapper, promotion banner, search, product grid, and add a visible `/ask` callout. Add category and price controls using the already loaded product fields, with safe handling for missing category/price values.

- [ ] **Step 4: Run the focused test and verify success**

Run `npm test -- --run src/pages/Index.test.tsx`. Expected: PASS.

- [ ] **Step 5: Commit the home storefront change**

Run:

```bash
git add src/pages/homepage-copy.ts src/pages/Index.tsx src/pages/Index.test.tsx
git commit -m "feat: make home the aperfy storefront"
```

### Task 2: Simplify customer-facing navigation and footer

**Files:**
- Modify: `src/components/layout/MacAppShell.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: `src/components/Navbar.tsx` if any visible public link still targets `/catalog` or `/our-process`

**Interfaces:**
- Sidebar links remain ordinary React Router links.
- `/ask` is the visible request destination.

- [ ] **Step 1: Add navigation assertions**

Extend `src/components/layout/MacAppShell.test.tsx` to assert that the store navigation includes `/ask` and does not render “Cómo funciona” or “Available now”.

- [ ] **Step 2: Run the focused test and verify failure**

Run `npm test -- --run src/components/layout/MacAppShell.test.tsx`. Expected: the current sidebar labels fail the new assertions.

- [ ] **Step 3: Update navigation and footer links**

Make the sidebar prioritize Home, Solicitar producto, Carrito, and account. Remove process/catalog labels. Update footer copy to describe the direct-deal store and link to Home, `/ask`, `/contact`, and account. Preserve the admin shell separately.

- [ ] **Step 4: Run the focused test and verify success**

Run `npm test -- --run src/components/layout/MacAppShell.test.tsx`. Expected: PASS.

- [ ] **Step 5: Commit navigation changes**

Run `git add src/components/layout/MacAppShell.tsx src/components/Footer.tsx src/components/Navbar.tsx src/components/layout/MacAppShell.test.tsx` and commit with `feat: simplify aperfy store navigation`.

### Task 3: Define the reduced public route map

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/RequestModel.tsx` or create `src/pages/Ask.tsx` if the existing page cannot support `/ask` copy cleanly
- Create or modify: `src/pages/Contact.tsx`
- Modify: route tests or add `src/App.test.tsx` if the current suite has no route-level coverage

**Interfaces:**
- `/ask` renders the request form.
- `/contact` renders a contact page inside `MacAppShell`.
- `/catalog` redirects to `/`.
- `/our-process`, `/materials`, `/request-product`, and `/request-model` redirect to `/` or `/ask` according to the approved route map.

- [ ] **Step 1: Add route-level tests**

Test that the legacy catalog path resolves to the home destination, `/ask` renders request content, and `/contact` renders its contact heading.

- [ ] **Step 2: Run route tests and verify failure**

Run the focused route test. Expected: `/contact` and `/ask` are not yet present under the exact approved map.

- [ ] **Step 3: Implement route redirects and contact page**

Import `Contact` and add it to the public shell. Route `/ask` to the existing request form, redirect legacy request aliases to `/ask`, redirect `/catalog` to `/`, and redirect editorial pages to `/`. Keep product aliases, checkout, account, and admin routes intact because existing flows rely on them.

- [ ] **Step 4: Run route tests and verify success**

Run the focused route test and then `npm test -- --run`. Expected: all tests pass.

- [ ] **Step 5: Commit route changes**

Run `git add src/App.tsx src/pages/RequestModel.tsx src/pages/Contact.tsx src/App.test.tsx` and commit with `feat: simplify aperfy public routes`.

### Task 4: Remove stale customer-facing references

**Files:**
- Modify any customer-facing files returned by `rg -n "\/catalog|our-process|Cómo funciona|How it works|Big deals|Small quantities" src`
- Preserve admin-only and compatibility references where needed.

**Interfaces:**
- Product links use `/products/:slug` or `/3dmodels/:slug`.
- Customer CTAs use `/`, `/ask`, `/contact`, product detail, or checkout.

- [ ] **Step 1: Search for stale references**

Run `rg -n "\/catalog|our-process|Cómo funciona|How it works|Big deals|Small quantities" src` and classify each match as customer-facing, compatibility, or admin-only.

- [ ] **Step 2: Replace customer-facing references**

Update visible CTAs, empty states, footer text, and motion route lists to match the new store map. Keep redirects and historical compatibility paths only where they prevent broken inbound links.

- [ ] **Step 3: Verify the audit**

Run the same `rg` command and confirm only intentional compatibility/admin matches remain.

- [ ] **Step 4: Commit cleanup**

Run `git add src` and commit with `chore: remove stale storefront references`.

### Task 5: Validate UI, browser routes, and production build

**Files:**
- Modify tests only if a validation exposes a real regression.

- [ ] **Step 1: Run full tests**

Run `npm test -- --run`. Expected: all tests pass.

- [ ] **Step 2: Run production build and diff checks**

Run `npm run build` and `git diff --check`. Expected: build succeeds and diff check is clean; document any existing chunk-size warning without treating it as a functional failure.

- [ ] **Step 3: Verify browser route matrix**

Check `/`, `/ask`, `/contact`, a product detail route, `/checkout`, `/catalog`, `/our-process`, and `/admin` in the local browser. Confirm the fixed macOS shell remains intact, legacy routes redirect safely, the home shows the product grid/filter controls, and internal content scrolls without outer window growth.

- [ ] **Step 4: Commit any validation-only fixes**

If validation requires changes, add targeted tests first, implement the fix, rerun the relevant checks, and commit with a focused message.

### Task 6: Publish and merge

- [ ] **Step 1: Inspect status and branch**

Run `git status --short`, `git log --oneline -5`, and `git fetch origin main`.

- [ ] **Step 2: Reconcile with main and push**

Merge `origin/main` if required, rerun tests after conflict resolution, then push `feat/aperfy-rebrand`.

- [ ] **Step 3: Create and merge pull request**

Create a PR describing the single-home storefront, `/ask`, contact route, compatibility redirects, and validation results. Merge it after checks pass and verify the merge commit/state with `gh pr view`.
