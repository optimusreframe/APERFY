

# Phase 6: Polish & UX Improvements

## Overview
Improve mobile responsiveness, loading states, animations, empty states, skeleton loaders, and general UX refinements across all pages.

---

## 1. Skeleton Loaders for Data-Loading Pages

**Files: `Store.tsx`, `Catalog.tsx`, `ProductDetail.tsx`, `Orders.tsx`, `Favorites.tsx`, `AdminDashboard.tsx`**
- Replace simple spinners with content-aware skeleton placeholders (using shadcn `Skeleton` component)
- Store/Catalog: grid of skeleton cards (image + text blocks)
- ProductDetail: skeleton for image gallery + text area
- Orders: skeleton rows
- This makes loading feel faster and less jarring

## 2. Mobile Navbar Improvements

**File: `src/components/Navbar.tsx`**
- Add cart icon with badge to mobile menu (currently only in desktop header)
- Ensure mobile menu closes on route change (some links already do this, verify all paths)

## 3. Store Product Cards — Relative Positioning Fix

**File: `src/pages/Store.tsx`**
- The favorite button uses `absolute` positioning but the parent card div lacks `relative` — the heart button floats incorrectly
- Add `relative` to the card container

## 4. Checkout — Pre-fill from Profile

**File: `src/pages/Checkout.tsx`**
- On mount, fetch user's profile (full_name, phone) and pre-fill the shipping form
- Reduces friction for returning users

## 5. Cart — Confirm Before Clear All

**File: `src/pages/Cart.tsx`**
- Add a confirmation dialog (AlertDialog) before "Clear All" to prevent accidental cart deletion

## 6. Smooth Page Transitions

**File: Multiple pages**
- Wrap main content of each page in a `motion.div` with a consistent fade-in animation
- Already done on some pages; standardize across: `Cart`, `Checkout`, `Profile`, `Orders`, `Favorites`

## 7. Toast Feedback Consistency

**Files: `Checkout.tsx`, `Profile.tsx`, `Favorites.tsx`, `ProductDetail.tsx`**
- Ensure all success/error toasts use the translation system (some currently use hardcoded English strings like "Added to cart")
- Use translated strings from `t.cart`, `t.profile`, etc.

## 8. Admin Orders — Missing Fragment Key Warning

**File: `src/pages/admin/AdminOrders.tsx`**
- The `<>...</>` fragment wrapping each order row lacks a `key` prop — wrap in `React.Fragment` with key to fix React warning

## 9. Footer — Link Support Items

**File: `src/components/Footer.tsx`**
- Support items (FAQ, Shipping, Returns, Contact) are `<span>` not links — either link them to relevant pages or add `cursor-default` styling to make it clear they're informational

## Files Summary

| Action | File |
|--------|------|
| Edit | `src/pages/Store.tsx` — skeleton loader, card fix |
| Edit | `src/pages/Catalog.tsx` — skeleton loader |
| Edit | `src/pages/ProductDetail.tsx` — skeleton loader, toast i18n |
| Edit | `src/pages/Cart.tsx` — clear confirmation dialog |
| Edit | `src/pages/Checkout.tsx` — pre-fill from profile, toast i18n |
| Edit | `src/pages/Orders.tsx` — skeleton loader |
| Edit | `src/pages/Favorites.tsx` — skeleton, toast i18n |
| Edit | `src/pages/Profile.tsx` — page transition |
| Edit | `src/components/Navbar.tsx` — mobile cart badge |
| Edit | `src/pages/admin/AdminOrders.tsx` — Fragment key fix |
| Edit | `src/pages/admin/AdminDashboard.tsx` — skeleton loader |
| Edit | `src/components/Footer.tsx` — minor styling |
| Edit | `src/i18n/translations.ts` — any missing toast keys |

