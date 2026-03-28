

# User Dashboard Redesign — Unified Tabbed Panel

## Problem
Currently the user panel is just a basic profile form with two buttons linking to separate pages (Orders, Favorites). Users must click the avatar dropdown in the navbar to navigate between sections. This feels outdated and fragmented.

## Solution
Transform `/profile` into a full **User Dashboard** with a tabbed interface that consolidates Profile, Orders, and Favorites into a single page. Remove the separate `/orders` and `/favorites` routes (redirect them to `/profile` with the correct tab). Add a sidebar on desktop and tabs on mobile.

## Layout

```text
Desktop (lg+):
┌─────────────────────────────────────────────┐
│ Navbar                                      │
├──────────┬──────────────────────────────────┤
│          │                                  │
│ Sidebar  │   Tab Content Area               │
│          │                                  │
│ 🏠 Dashboard │  (Overview / Profile /      │
│ 👤 Profile   │   Orders / Favorites)       │
│ 📦 Orders    │                              │
│ ❤️ Favorites │                              │
│ 🚪 Logout    │                              │
│          │                                  │
├──────────┴──────────────────────────────────┤
│ Footer                                      │
└─────────────────────────────────────────────┘

Mobile:
Horizontal scrollable tab bar at top of content area
```

## Tabs / Sections

1. **Overview (Dashboard)** — Welcome card with user name/avatar, quick stats (total orders, total favorites, total likes received), and shortcut cards to other sections. Glowing gradient cards with animated counters.

2. **Profile** — Existing profile form (avatar upload, name, phone, email). Keep current logic intact.

3. **My Orders** — Move existing Orders page content inline. Same expandable order cards.

4. **My Favorites** — Move existing Favorites page content inline. Same product grid with remove buttons.

## Files Modified

1. **`src/pages/Profile.tsx`** — Complete rewrite into a tabbed dashboard layout with sidebar (desktop) and tab bar (mobile). Import and render Orders/Favorites content inline using extracted components.

2. **`src/pages/Orders.tsx`** — Extract order list into a reusable component, keep the page as a redirect to `/profile?tab=orders`.

3. **`src/pages/Favorites.tsx`** — Same: extract content, redirect page to `/profile?tab=favorites`.

4. **`src/i18n/translations.ts`** — Add new keys: `profile.overview`, `profile.dashboard`, `profile.totalOrders`, `profile.totalFavorites`, `profile.totalLikes`, `profile.welcomeBack`, tab labels.

5. **`src/App.tsx`** — Keep `/orders` and `/favorites` routes but they will redirect to `/profile` with query params.

6. **`src/components/Navbar.tsx`** — Update dropdown menu items to navigate to `/profile?tab=orders` etc. instead of separate pages.

## Visual Style
- Dark card backgrounds with subtle gold border glow on hover
- Gradient accent on active sidebar item
- Overview stat cards with glassmorphism effect and animated number counters
- Consistent with existing premium dark + gold brand theme
- Smooth tab transitions using framer-motion

