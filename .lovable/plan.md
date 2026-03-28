

# Phase 5: User Profile, Favorites Page, Admin Dashboard Enhancement & Notifications

## Overview

Add user account management (profile page, favorites page), enhance the admin dashboard with real order/revenue stats, and add WhatsApp notification to admin when a new order is placed.

---

## 1. User Profile Page (`/profile`)

**New file: `src/pages/Profile.tsx`**
- Protected route
- Display and edit: full name, phone, avatar (upload to `avatars` bucket)
- Show account email (read-only)
- Link to "My Orders" and "My Favorites"
- Add profile link to Navbar (user avatar or icon when logged in)

## 2. Favorites Page (`/favorites`)

**New file: `src/pages/Favorites.tsx`**
- Protected route
- Grid of user's favorited products (same card style as Store)
- Remove from favorites button on each card
- Click card → navigate to product detail
- Empty state: "No favorites yet — browse the store"

## 3. Admin Dashboard Enhancement

**Edit: `src/pages/admin/AdminDashboard.tsx`**
- Add order count and total revenue stats cards
- Recent orders list (last 5) with status badges
- Orders by status breakdown (mini chart or stat cards)
- Low-effort high-impact improvement

## 4. WhatsApp Admin Notification on New Order

**New edge function: `supabase/functions/notify-new-order/index.ts`**
- Called after order is placed in Checkout
- Sends a WhatsApp message link (opens wa.me) — or alternatively, logs to admin
- Since we can't programmatically send WhatsApp without Twilio, we'll instead: insert a notification into a simple `admin_notifications` table that the admin dashboard polls/shows
- **Alternative simpler approach**: After placing the order, the Checkout page shows a toast to the user AND the admin dashboard shows a "new orders" indicator (badge on sidebar)

## 5. Navbar Updates

**Edit: `src/components/Navbar.tsx`**
- When logged in: show user avatar/icon dropdown with links to Profile, My Orders, My Favorites, Logout
- Replace current scattered auth buttons with a clean dropdown menu

## 6. Routing

Add to `App.tsx`:
- `/profile` → Profile (protected)
- `/favorites` → Favorites (protected)

## 7. Translations

Add keys for: profile (edit profile, save, avatar, phone), favorites (my favorites, empty state, remove), dashboard stats labels.

## 8. Files Summary

| Action | File |
|--------|------|
| Create | `src/pages/Profile.tsx` |
| Create | `src/pages/Favorites.tsx` |
| Edit | `src/App.tsx` — new routes |
| Edit | `src/components/Navbar.tsx` — user dropdown menu |
| Edit | `src/pages/admin/AdminDashboard.tsx` — order stats |
| Edit | `src/pages/admin/AdminSidebar.tsx` — new orders badge |
| Edit | `src/i18n/translations.ts` — new keys |
| No migration needed — all tables already exist |

