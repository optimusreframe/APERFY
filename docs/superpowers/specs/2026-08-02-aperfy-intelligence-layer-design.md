# APERFY Intelligence Layer Design

## Status

Approved direction: `APERFY Intelligence Layer`, fused with the assigned `scientific-notation-oscilloscope-signal-bench` challenger from concept seed `7b7018db`.

This is a redesign of the public storefront and a content/branding audit of the full APERFY application. Product truth from `PRODUCT.md` is authoritative. The old 3D-printing interface is evidence and anti-reference, not a visual constraint.

## Product mechanism

APERFY turns a sourced opportunity into a legible buying signal: discover the product, inspect why the value is credible, verify availability, and place an order for human confirmation. The interface should feel like a calm instrument panel for shopping, not a generic marketplace or a dashboard pretending to be a store.

## Visual world

The first viewport is a signal bench: near-black evergreen glass, the supplied luminous green logo, an etched measurement field, a phosphor trace that resolves from noise into a clear “perfect find”, and a small set of meaningful readouts. The trace is illustrative UI geometry, not a claim of measured market data. Product imagery and product copy remain the dominant buying content.

The system grammar carries across the storefront:

- Palette: evergreen-black, ice, APERFY green, lime verification, amber warning. Green marks action/verified value; amber marks attention, not fake urgency.
- Composition: graticule and signal lines are used as navigation and explanation, never as a decorative full-page grid. Sections feel like instrument modules but remain generous and editorial.
- Type: a distinctive display face paired with a readable sans; condensed/monospace styles are reserved for IDs, price evidence dates, inventory readings and status labels.
- Controls: sliders, filters and toggles feel detented and precise; pressed states invert or illuminate a single signal channel.
- Motion: one authored hero timeline resolves a noisy trace into the hero, then product signals rise in sequence. Microinteractions use short transform/opacity changes. Reduced motion keeps the final state visible without the sweep.
- Responsive: the graticule becomes a simpler horizontal signal rail on small screens; product cards remain touch-friendly and do not rely on hover.

Avoid: gradient text, emoji as icons, fake metrics, countdown urgency, nested card grids, glass as decoration, and generic “AI-powered” claims. Do not place an eyebrow above the hero heading; the heading carries the message directly.

## First-surface experience

1. Navigation: APERFY logo, Catalog, How it works, About, language, theme, cart. Remove 3D-specific labels and routes from public navigation.
2. Hero: heading “Find the signal in the noise.” followed by APERFY’s value proposition, a single Explore finds CTA, and the interactive signal bench visual. The visual includes a clear accessible text equivalent.
3. Trust instrumentation: three compact proof statements—value verified, inventory real, order confirmed human-to-human—using authored line icons rather than repeated icon cards.
4. Curated catalog: “Current signal” section with search, category filters and product cards. Cards expose product image, condition, stock state, APERFY price, reference evidence state and a clear action.
5. Explanation rail: “How a find becomes an APERFY find” with the sequence sourced → checked → listed → confirmed. It uses a connected line and state changes, not four generic feature cards.
6. Editorial modules: limited selection, newly verified, and practical finds. These are data-backed sections that can collapse cleanly when no products exist.
7. Footer: APERFY identity, support, legal, language and no-printing leftovers.

## Full audit and terminology migration

Search all source, Supabase functions/migrations, emails, metadata, manifests, tests, storage paths and docs for 3DtoPrint/3D-printing references. Replace only commercial/brand references; preserve legitimate technical browser concepts such as `window.print()` and CSS `@media print`.

Map public terms as follows:

- models → products/finds where the label is commercial.
- materials → product attributes or condition where applicable.
- model request → product request or “Tell us what you’re looking for”.
- printing/printing status → order preparation/fulfillment status.
- 3dmodels routes → product routes, with redirects for existing links.
- email/site URLs and sender branding → APERFY and `aperfy.kpwr.dev` placeholders.

Remove or quarantine source-only AI 3D generation/render settings from the APERFY public/admin experience unless they are re-scoped to general product enrichment. No destructive database migration is allowed in this pass.

## Motion implementation

Add GSAP only where it materially improves the signal bench and its section choreography. Use React integration with scoped cleanup. The hero timeline uses a single timeline with labels; all transforms use GSAP aliases, and `gsap.matchMedia()` handles desktop/mobile and `prefers-reduced-motion`. Do not add ScrollTrigger to the hero unless a bounded scroll section proves it necessary.

Proposed public motion tokens:

- micro: 0.16s, `power2.out`
- state: 0.24s, `power3.out`
- hero: 1.2s, `power3.out`
- section reveal: 0.7s, `power3.out`, stagger max 0.08s

## Content and assets

Use the supplied logo. Use the existing product images until real APERFY product photography is supplied. Authored SVG/canvas geometry may create the signal bench, traces and icons. Do not fabricate testimonials, sales metrics, market prices, manufacturer references, or customer logos. New empty states must explain what is missing and how the operator can add real inventory.

## Acceptance criteria

- No user-visible commercial/brand reference to 3DtoPrint or 3D printing remains after the final audit, except explicitly documented technical false positives.
- Public navigation, metadata, auth, cart, checkout, order history, admin labels and email templates consistently say APERFY.
- Homepage feels instrumented and technology-led while retaining shopping clarity at first glance.
- Hero and section motion is scoped, cleanly disposed, reduced-motion safe and does not animate layout properties.
- EN/ES copy remains complete for new surfaces.
- `npm test`, targeted ESLint, `npm run build`, the mechanical Impeccable detector, and desktop/mobile browser checks pass or have documented inherited failures.
