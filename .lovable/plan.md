## Goal
Lift the Product Detail and Checkout pages to the same Apple + Palantir tech-premium feel using framer-motion — refined typography, dense-but-airy layout, monospace numerics, micro-interactions, smooth section transitions. UI-only; no business logic, validation, RLS, emails, payment flow, or shipping math changes.

## Scope

### 1. Product Detail (`src/pages/ProductDetail.tsx`)
- **Hero refresh**: switch to a tighter 2-column grid (gallery left sticky / info right), generous negative space, hairline dividers (`border-white/5`), gold accent rules.
- **Gallery**: Apple-style. Large main image with subtle `layoutId` shared element when changing thumbnails (framer-motion `AnimatePresence` + `motion.img`), thumbnails as 64px squares with a 1px gold ring on active, smooth crossfade, zoom hint cursor, keyboard arrows. Full-screen lightbox keeps existing logic but gets spring transitions and a Palantir-style top bar (index counter in mono, close icon).
- **Identity block**: name in display serif (existing), category as small uppercase mono tag, price as large tabular-nums with subtle weight contrast (`$` smaller, integer large, decimals smaller).
- **Tech spec strip (Palantir)**: dense horizontal row of stats — Weight, Dimensions, Material, Print time — each cell uppercase mono label + bold mono value, separated by hairlines. Replaces the current scattered spec display.
- **Variation & material selectors**: segmented control (pill row) with animated `layoutId` highlight that slides between options; price recalculates with a brief `motion` number flip.
- **Sticky action bar**: on scroll past the fold, a bottom translucent bar (backdrop-blur) slides up with product thumb + price + Add to Cart, mirroring Apple PDP behavior. Mobile only on small screens; desktop keeps the inline CTA.
- **Sections below**: description, reviews, related — wrapped in `motion.section` with `whileInView` stagger.

### 2. Checkout (`src/pages/Checkout.tsx`)
- **Step rail**: replace current indicator with a Palantir-style horizontal progress: numbered nodes connected by a thin line, active node filled gold, completed nodes show a checkmark, animated line fill with `motion`.
- **Section cards**: tighten to translucent panels (`bg-white/[0.02] border border-white/5 rounded-2xl`), hairline section headers with monospace step number ("01 / CONTACT"), spring expand/collapse via `AnimatePresence` + `height: auto`.
- **Floating-label inputs**: keep current `Field` helper; refine focus ring to a 1px gold underline that animates in (`motion.div` underline with `scaleX`), error state shakes once.
- **Payment method cards**: large radio cards with `layoutId` selection ring that slides between options, icon + name + short caption, subtle hover lift.
- **Order summary (right column)**: sticky panel with Apple-style line items (image, name, qty mono, price tabular), animated total that flips digits when shipping/items change, hairline dividers, "Order total" in larger weight at bottom.
- **Confirmation screens** (online & WhatsApp): keep existing spring scale checkmark, refine layout to centered Apple-style — large checkmark, headline, mono order number chip, primary/ghost button pair.
- **Page transitions**: wrap each step in `AnimatePresence mode="wait"` with a consistent fade+8px-y spring for cohesion.

### 3. Shared polish
- Tabular-nums utility class for all prices and numeric stats.
- Standardize on `transition={{ type: 'spring', stiffness: 260, damping: 28 }}` for the new motion interactions.
- All colors via existing semantic tokens (`--background`, `--foreground`, `--primary` gold, `--muted-foreground`). No hex literals in components.

## Out of scope
- No changes to cart logic, pricing formula, shipping calculation, validation schemas, rate limiting, WhatsApp message, emails, edge functions, DB, or RLS.
- No new dependencies (framer-motion already used).
- No changes to admin panel, navbar, footer, or other pages.

## Files
- Modify: `src/pages/ProductDetail.tsx`, `src/pages/Checkout.tsx`
- No new files unless a small `StickyAddBar` helper proves cleaner (kept colocated otherwise).

## Verification
- Visual pass at 1112px (current viewport) and mobile breakpoint via preview.
- Confirm: add-to-cart still triggers floating toast, checkout still creates order + sends email, WhatsApp flow still opens with correct message, variation/material price recalculation still correct.
