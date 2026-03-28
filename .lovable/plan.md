

# Premium 3D Navbar Redesign

## Overview
Transform the navbar into a premium, 3D-themed navigation bar with depth effects, gold glow accents, animated elements, and a more sophisticated visual treatment that matches the 3D printing brand.

## Changes

### 1. Navbar Container (`src/components/Navbar.tsx`)
- **Floating navbar**: Add margin from edges so it appears as a floating bar with rounded corners and a subtle gold border glow
- **3D depth effect**: Multiple layered box-shadows creating a sense of depth/elevation, with a faint gold underglow
- **Active link indicator**: Replace simple background highlight with a pill-shaped indicator that has a gold gradient border and subtle inner glow
- **Logo enhancement**: Add a subtle 3D rotate animation on hover to the "3D" badge, plus a gold pulse glow behind it
- **Nav link hover**: Add a bottom-line sweep animation with gold gradient on hover (not just bg change)
- **Cart icon**: Add a subtle bounce animation when item count changes
- **Sign Up button**: Add a shimmering sweep effect across the gold gradient (animated pseudo-element)
- **Scroll behavior**: Navbar slightly shrinks and increases blur on scroll (h-16 → h-14, stronger backdrop-blur)
- **Separator dots**: Add small gold dots between nav links as visual dividers
- **User dropdown**: Add gold accent border and glass morphism to the dropdown panel

### 2. Mobile Menu Enhancement
- **Slide-in from right** instead of accordion drop-down
- **Glass morphism panel** with stronger blur and gold accent lines
- **Staggered animation** for menu items appearing one by one
- **3D hamburger animation**: Menu icon transforms with a 3D flip into X

### 3. New Animations (`tailwind.config.ts`)
- `shimmer`: horizontal sweep for the Sign Up button
- `glow-pulse`: pulsing gold glow for active indicators
- `navbar-shrink`: transition for scroll-based size change

### 4. Supporting CSS (`src/index.css`)
- `.navbar-floating` class with multi-layer shadow
- `.nav-link-3d` hover underline sweep
- `.shimmer-gold` animated gradient sweep
- `.nav-glass` enhanced glass morphism for mobile menu

## Files

| Action | File |
|--------|------|
| Edit | `src/components/Navbar.tsx` — full redesign with 3D effects |
| Edit | `tailwind.config.ts` — new keyframes (shimmer, glow-pulse) |
| Edit | `src/index.css` — new utility classes for navbar |

