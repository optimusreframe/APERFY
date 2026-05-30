## Goal
Restructure the **layout** (not just styling) of the Product Detail and Checkout pages so they feel architecturally Apple + Palantir: instrument-panel grids, left-side meta rails, floating sticky chrome, command-bar interactions, dense data zones balanced with cinematic whitespace. Pure UI/layout work — no logic, validation, RLS, pricing, shipping, email, or payment changes.

---

## 1. Product Detail (`src/pages/ProductDetail.tsx`)

### New layout grid (desktop ≥ lg)
```text
┌──────────────────────────────────────────────────────────────────────┐
│  TOP COMMAND BAR  (sticky, hairline)                                 │
│  ‹ Back   ·   crumbs   ·   PRD-XXXX (mono id)   ·   share · heart    │
├──────────┬───────────────────────────────────────┬───────────────────┤
│ LEFT     │                                       │ RIGHT             │
│ THUMB    │            HERO IMAGE                 │ INFO RAIL         │
│ RAIL     │            (large, square)            │ (sticky)          │
│ (sticky) │                                       │                   │
│  60px    │            image counter chip         │  category mono    │
│  col     │            (mono "01 / 04")           │  title (display)  │
│          │                                       │  price (huge)     │
│          │                                       │  segmented vars   │
│          │                                       │  qty stepper      │
│          │                                       │  ─ hairline ─     │
│          │                                       │  ADD TO CART CTA  │
│          │                                       │  secure note      │
├──────────┴───────────────────────────────────────┴───────────────────┤
│  TECH SPECS STRIP  (full-width Palantir data row, 4 cells)           │
│  WEIGHT  │  DIMENSIONS  │  MATERIAL  │  PRINT TIME                   │
├──────────────────────────────────────────────────────────────────────┤
│  OVERVIEW (left col)    │    DETAILS LIST (right col, key/value)     │
├──────────────────────────────────────────────────────────────────────┤
│  REVIEWS                                                              │
├──────────────────────────────────────────────────────────────────────┤
│  RELATED (horizontal scroll-snap row, not 4-grid)                    │
└──────────────────────────────────────────────────────────────────────┘
```

Key layout moves:
- **3-column hero**: vertical thumbnail rail (60px) on the far left, large hero in center, sticky info rail on right. Replaces current 2-col layout.
- **Sticky top command bar** below the navbar with back/crumbs, mono product code, share/favorite — gives the page a "workstation" feel.
- **Tech specs strip**: full-width 4-cell data row directly under the fold, hairline-divided, mono labels/values (Palantir signature).
- **Two-column overview/details** below specs: prose on the left, structured key/value table on the right (material composition, recommended use, care, dimensions detail).
- **Related products** become a horizontal scroll-snap row (Apple PDP style), not a static 4-up grid.
- **Mobile**: collapses to single column; thumbnail rail becomes horizontal scroll under hero; sticky info collapses; floating CTA bar stays.

### Hero gallery interactions
- Click hero → lightbox (existing).
- Hover → subtle parallax tilt (framer-motion).
- Image counter chip overlaid bottom-left of hero ("01 / 04" mono).
- Thumbnail rail items animate selection with `layoutId` outline.

### Info rail (right column, sticky)
Compressed to essentials only — meta tag, title, price, variations, quantity, CTA. Description/specs/reviews live outside the fold so the buying decision area stays clean.

### Tech spec strip
A new full-width band, 4 equal cells divided by hairlines. Replaces the inline `<TechSpecStrip>` currently buried in the info column. Pulls weight, dimensions, material, print_time (already in product schema if available; otherwise fall back to "—").

### Details key/value list
New section below overview — renders a Palantir-style left-aligned dl: `MATERIAL · PLA Premium`, `LAYER HEIGHT · 0.2mm`, etc. Sourced from existing product fields; cells default to "—" when unset. No new DB columns.

---

## 2. Checkout (`src/pages/Checkout.tsx`)

### New layout grid (desktop ≥ lg)
```text
┌──────────────────────────────────────────────────────────────────────┐
│  CHECKOUT COMMAND BAR (sticky top, hairline)                         │
│  ‹ Back to cart   ·   CHECKOUT · 01/03 SHIPPING   ·   ORD-XXXX       │
├────────────────┬─────────────────────────────────┬───────────────────┤
│ LEFT NAV RAIL  │   MAIN STAGE (active section)   │ RIGHT SUMMARY     │
│ (sticky)       │                                 │ (sticky)          │
│                │                                 │                   │
│ ▸ 01 CONTACT   │   Active section card,          │  Order line items │
│ ● 02 ADDRESS   │   expanded with form fields     │  ─ hairline ─     │
│ ○ 03 SHIPPING  │                                 │  Subtotal         │
│ ○ 04 PAYMENT   │   Floating-label inputs         │  Shipping         │
│                │   Continue → CTA                │  ─ hairline ─     │
│                │                                 │  TOTAL (huge)     │
│ ─ status ─     │                                 │                   │
│ secure · 256   │                                 │  Trust badges     │
│ items 03       │                                 │                   │
└────────────────┴─────────────────────────────────┴───────────────────┘
```

Key layout moves:
- **Sticky command bar** at the top showing back-to-cart, current step indicator ("01 / 03 — SHIPPING"), and mono order draft id.
- **Left nav rail**: vertical step list (4 steps now including Payment) with mono numbers, active/done/upcoming states. Click a completed step to jump back. Replaces the horizontal `StepRail` for desktop; horizontal version remains on mobile.
- **Center stage**: shows only the active section at a time (not stacked collapsibles). Cleaner focus, Apple-style "one decision per screen." Sections fade/slide between each other with `AnimatePresence mode="wait"`.
- **Right summary**: sticky, with a more structured Palantir data block — items list, subtotal, shipping (animates when changed), large total, trust row.
- **Mobile**: rail collapses into existing horizontal step indicator; main stage flows full-width; summary becomes the existing collapsible drawer at the top.

### Payment step
Becomes its own dedicated stage instead of a separate `step === 'method'` screen. Same options (WhatsApp + online methods), but now part of the same 4-step rail so the user always sees their position.

### Confirmation screens
- Payment-instructions and WhatsApp-sent stay as dedicated full-page success states.
- Layout polished: centered hero check, mono order id chip, primary/ghost button pair, transition out of the main grid for cinematic effect.

### Left rail status footer
Below the steps, a small Palantir-style status block: lock icon + "SECURE · TLS 1.3", item count in mono, ETA range pulled from selected shipping provider.

---

## 3. Shared layout polish
- Introduce a thin `<TopCommandBar>` pattern on both pages (sticky, `h-12`, hairline border, mono crumbs/id, optional right actions). Co-located in each file — no new shared component yet, to keep scope tight.
- Consistent grid widths: hero/checkout containers cap at `max-w-7xl`, rails are fixed-width (`w-[88px]` left nav, `w-[360px]` right summary).
- Use existing semantic tokens only; no new colors.

## Out of scope
- No changes to: cart logic, pricing math, shipping calculation, validation schemas, rate limiting, WhatsApp message body, transactional emails, edge functions, DB, RLS, admin pages, navbar, footer, other routes.
- No new dependencies.
- No new DB columns (details list uses what already exists, falls back to "—").

## Files
- Modify: `src/pages/ProductDetail.tsx`, `src/pages/Checkout.tsx`
- No new files.

## Verification
- Visual review at 1112px (current) and mobile breakpoint via preview.
- Confirm: add-to-cart still triggers floating toast; checkout still creates order + sends email; WhatsApp flow opens with correct message; variation/material price recalculation correct; jumping back via left rail does not reset form state.
