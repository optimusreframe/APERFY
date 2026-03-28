

# Premium 3D Auth Page Redesign

## Overview
Redesign the Auth page to match the reference screenshots — a premium dark card with gold accents, 3D depth effects, the 3DtoPrint logo at the top, and enhanced visual treatment.

## Changes

### Edit: `src/pages/Auth.tsx`

**Logo at top of card:**
- Add the same 3DtoPrint logo (gold gradient "3D" badge + text) from the Navbar, centered above the title
- Badge gets a glow-pulse animation behind it

**Card styling upgrade:**
- Outer gold glow border using a gradient border technique (double container with gold gradient on outer, dark bg on inner)
- Multi-layer 3D box-shadows for depth (dark shadow below + subtle gold underglow)
- Slight perspective tilt on initial entrance animation (rotateX)

**Input fields:**
- Rounded-xl inputs with darker bg (`bg-[#1a1a2e]` or similar deep dark)
- Larger padding, more prominent icons
- Subtle gold border on focus instead of default ring
- Inputs get a slight inset shadow for a "recessed" 3D feel

**Submit button:**
- Full-width rounded-xl gold gradient with 3D shadow
- Shimmer sweep animation on hover (reuse existing shimmer keyframe)

**Background:**
- Add subtle floating 3D geometric shapes behind the card (small rotating cubes/triangles with low opacity)
- Radial gold gradient spot behind the card for ambient glow

**Transitions:**
- Smooth AnimatePresence for switching between login/signup (fields slide in/out)
- Card entrance: fade + subtle scale + rotateX from slight angle

Single file edit. No new files needed.

