# APERFY macOS Deal Store — Design Specification

Date: 2026-08-02
Status: Approved direction; implementation preview pending visual validation.

## Product direction

APERFY is a technology-forward store for products purchased through wholesale and occasional big deals. Visitors should immediately understand what is available now, why the price can be lower than market reference, and that inventory is limited and can change daily.

The public experience must not use “Signal”, “Find the signal”, “value signal”, or abstract intelligence language as the primary proposition. Use direct commerce language: “Big deals”, “Available now”, “New today”, “Limited stock”, “Bulk-buy value” and “Shop the catalog”.

## Visual world

The site uses a hybrid responsive system with dark mode as the default and the existing APERFY green identity preserved. The desktop composition resembles a native macOS app window open on a MacBook Pro: dark workspace around a centered application surface, macOS traffic-light controls, a stable title bar, sidebar navigation and a dense but calm content canvas. On mobile, the shell becomes a full-screen app surface with the same hierarchy and no fake desktop chrome that reduces usable space.

Logo assets are canonical:

- `public/logo.png`: every website logo placement, including navbar, footer, auth and admin.
- `public/favicon.png`: browser favicon, Apple touch icon, PWA icon and install icon.

## First viewport

The first viewport is an app shell, not a marketing hero. The title bar identifies “APERFY Store”. The main pane opens with the direct proposition “Big deals. Small quantities.”, supporting copy about wholesale opportunities and daily-changing availability, and a primary “Shop available products” action. A compact live availability strip explains that published stock is what is currently available. The first product row appears without requiring a long scroll.

## Visitor path

1. Recognize APERFY as a live technology store.
2. See current products and deal framing immediately.
3. Filter/search by product, category or brand.
4. Open a product, review price and availability context.
5. Add to cart and continue through the existing order-first checkout flow.

## Motion thesis

The macOS shell settles in with a short opacity/translate entrance. Product groups reveal on scroll with staggered transform and opacity only. Deal panels use restrained parallax bounded to the viewport. A pointer-following green light is decorative and disabled for coarse pointers. Hover states use subtle elevation and color, never uncontrolled scale. `prefers-reduced-motion` shows content immediately and removes cursor/parallax effects.

The installed Genjutsu cast skill is used as the motion design reference, with the existing GSAP and Framer Motion stack retained. No new animation dependency is required.

## Content rules

- Never promise permanent stock.
- Never invent a market price or discount; show a reference only when backed by existing product data.
- Do not imply all products are wholesale, only that APERFY sources occasional big deals and bulk purchases.
- Keep English and Spanish equivalents direct and commercial.

## Validation

- Preview in the live browser at `http://127.0.0.1:8080/`.
- Verify logo and favicon asset usage through DOM and document metadata.
- Verify desktop and mobile shell composition.
- Verify reduced-motion branch and keyboard focus states.
- Run unit tests, production build, `git diff --check`, and one Impeccable detector pass after implementation.
