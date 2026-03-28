

# MakerWorld-Style Product Cards with Like & Favorite Counters

## Overview
Redesign product cards across `/3dmodels` (Store), `/catalog`, and FeaturedSection to match MakerWorld's card style: clean image, title below, and a bottom row showing like count + favorite count — always visible, not hidden behind hover.

## Key Changes

### 1. Bulk-fetch likes & favorites counts (performance)
Currently `LikeButton` fires 1-2 queries per card. With many products this is N+1. Instead, fetch all counts in bulk at the page level and pass them down.

- In `Store.tsx` and `Catalog.tsx`, add two queries:
  - `product_likes` grouped count: `select('product_id', { count: 'exact' })` — actually we'll fetch all likes for displayed products and count client-side, or use a single query with `.in('product_id', productIds)` then aggregate.
  - `favorites` count per product: same approach.
- Pass `likeCount` and `favoriteCount` as props to each card.

### 2. Product Card Redesign (MakerWorld style)
Each card will have:
- **Image**: `aspect-[4/3]` (wider, like MakerWorld) instead of current `aspect-[4/5]`
- **Category badge**: bottom-left overlay on image (keep existing)
- **Share button**: top-right on hover (keep existing)
- **Below image**:
  - Product name (bold, 1-2 lines)
  - Price row
  - **Footer row**: `ThumbsUp icon + count` and `Heart icon + count` — always visible, small text, muted color. Like MakerWorld's download + like counters.

### 3. Files Modified

**`src/components/LikeButton.tsx`** — Add a `countOnly` mode that just displays the icon + a passed-in count (no fetching), for use in card grids. Keep existing interactive mode for detail pages.

**`src/components/FavoriteCount.tsx`** (new) — Simple display component: Heart icon + count number.

**`src/pages/Store.tsx`**:
- Add bulk queries for like counts and favorite counts per product
- Redesign card layout: image aspect `4/3`, title, price, footer with like+fav counts
- Keep sidebar filters as-is
- Footer counters always visible (not hover-gated)

**`src/pages/Catalog.tsx`**:
- Same bulk queries and card redesign
- Keep dialog functionality as-is

**`src/components/landing/FeaturedSection.tsx`**:
- Same card redesign with counters

### 4. Card Layout Structure
```text
┌──────────────────────┐
│                      │
│      Product Image   │
│    (aspect 4/3)      │
│  [category]    [share]│
├──────────────────────┤
│ Product Name          │
│ $12.99                │
│ 👍 24    ❤️ 12        │
└──────────────────────┘
```

The footer row uses `ThumbsUp` + count and `Heart` + count in `text-muted-foreground text-xs`, always visible — matching MakerWorld's style but with our gold/dark theme.

