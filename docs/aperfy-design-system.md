# APERFY design system

APERFY is precise, magnetic, soft and trustworthy. The logo drives a fresh green identity: primary `#22C55E`, lime accent `#A3E635`, deep evergreen text `#163329`, and ice surfaces `#F5FAF7`. Dark mode uses evergreen-black surfaces with the same green accent.

## Rules

- Product imagery and price are the visual focus; glass is reserved for navigation, summary and intentional elevation.
- Use `Space Grotesk` for display and `DM Sans` for readable UI copy.
- Use CSS transitions for micro states (120–220ms), Framer Motion for entrances and layout transitions (180–320ms).
- Respect `prefers-reduced-motion`; never hide critical content behind animation.
- Green communicates action or verified value, not fake urgency.

## Components

Core surfaces: floating navbar, product card, rounded primary button, search field, cart sheet, conversational checkout stepper, order status and admin table. All must expose visible focus, maintain 44px touch targets and work in light/dark/system themes.

## Commerce trust

Only show savings when a product has a valid positive reference price and a verification timestamp. Orders are created before WhatsApp handoff; APERFY does not process online payments in the storefront.

