

# Product Detail Premium Redesign + Loader Timing Fix

## Two tasks:

---

## 1. Image Zoom: Fix exit + add controls

**Problem**: Zoom activates on hover but there's no way to exit or control it on touch devices. On desktop, leaving the image should deactivate zoom but it feels broken.

**Solution**: Replace hover-zoom with a click-based lightbox/modal system:

- **Click on image** opens a fullscreen overlay (`fixed inset-0 z-50 bg-black/90`)
- Inside the overlay: image at full resolution with **pinch-to-zoom** and **scroll-to-zoom** support
- Controls: **X button** (top-right) to close, **zoom slider** or **+/- buttons**, **reset zoom button**
- Arrow buttons to navigate between images within the lightbox
- Press **Escape** to close
- On the main product page, keep a subtle hover magnify effect (scale 1.3x, not 2x) with a "Click to enlarge" label

---

## 2. Product Detail Page Premium Redesign

**Current**: Basic two-column WordPress-style layout with plain cards.

**New design — tech/3D premium aesthetic**:

### Visual overhaul:
- **Hero image section**: Full-width on top for mobile, sticky sidebar for desktop. Add a glass-morphism border (`border border-white/10 backdrop-blur`) and subtle gold glow shadow
- **Floating action bar**: Sticky bottom bar on mobile with price + Add to Cart button (like Apple Store)
- **Glassmorphism cards** for each section (Materials, Variations, Quantity) with `bg-card/50 backdrop-blur-xl border border-white/5`
- **Animated section reveals** with staggered `motion.div` animations
- **Price display**: Larger, with animated counter effect, gold gradient text
- **Tech grid lines**: Subtle grid pattern overlay behind the product info area
- **Badge redesign**: Glowing neon-style badges with pulse animation for "In Stock"
- **Thumbnail strip**: Horizontal scroll with active indicator glow, larger thumbnails (20x20 → w-20 h-20)
- **Specs section**: Grid layout with icon cards for weight, dimensions, material — each in its own mini glass card
- **Add to Cart button**: Larger with particle/shimmer animation on hover

### Layout changes:
- Desktop: Image column sticky (`sticky top-24`) so product info scrolls beside it
- Mobile: Image carousel with dots indicator at top, then info flows below
- Sections separated by subtle gold gradient dividers instead of plain borders

---

## 3. Loader Timing Fix

**Problem**: The text "3D to Print" isn't readable before the loader fades out. Currently:
- Phase 0 (floating): 0-1200ms
- Phase 1 (assembly starts): 1200ms
- Phase 2 (glow): 2200ms  
- Fade out: 2700ms → only 500ms to read the assembled text

**Fix**: Adjust timing so assembly completes faster and text is readable for ~1 second:
- Phase 0 → Phase 1 at **600ms** (start assembling much earlier)
- Increase lerp speed from 0.06 to **0.10** in phase 1, and 0.12 to **0.18** in phase 2
- Phase 1 → Phase 2 at **1400ms** (glow kicks in earlier)
- Keep total duration at 3s but delay fade: opacity fade at **2600ms**, complete at **3200ms**
- This gives **~1.2 seconds** of readable assembled text before fade begins

---

## Files to modify

- `src/pages/ProductDetail.tsx` — complete redesign with lightbox zoom, premium UI
- `src/components/SplashLoader3D.tsx` — timing adjustments only (lines 400-406, 151-152)

