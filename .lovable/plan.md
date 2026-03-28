

# Multi-Feature Update Plan

## 1. Hero Section — Fill empty right-side area
The right column (desktop only, `hidden lg:flex`) currently shows only a wireframe rotating cube with pulsing circles. It looks empty.

**Solution:** Replace the abstract cube with a visually rich 3D printer illustration composed of:
- A larger, more prominent animated 3D printer icon/composition
- Add 3-4 floating product showcase cards (small tilted cards showing sample product images from the database) orbiting around the central element
- Add a glowing gradient orb behind the composition for visual weight
- Keep the geometric shapes but increase their opacity slightly

**File:** `src/components/landing/HeroSection.tsx` — redesign the right column (lines 127-148)

---

## 2. Mobile Product Grid — 2 columns, modern card style
Currently grids use `grid-cols-1` on mobile. The reference (MakerWorld/Bambu Handy) shows a compact 2-column masonry-like grid with rounded image cards.

**Changes:**
- **`src/pages/Store.tsx`**: Change `grid-cols-1 sm:grid-cols-2` to `grid-cols-2 sm:grid-cols-2 lg:grid-cols-3` — always 2 cols on mobile
- **`src/pages/Catalog.tsx`**: Same grid change, `grid-cols-2` on mobile
- **`src/components/landing/FeaturedSection.tsx`**: Change to `grid-cols-2 lg:grid-cols-4`
- Reduce card padding on mobile (`p-3` vs `p-4`), smaller text, tighter gaps (`gap-3` on mobile)
- Make product card images use `aspect-[4/5]` ratio instead of `aspect-square` for a more modern tall look on mobile

---

## 3. Like + Share buttons on product cards & detail
**Database migration:** Create `product_likes` table:
```sql
CREATE TABLE public.product_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.product_likes ENABLE ROW LEVEL SECURITY;
-- RLS: users can insert/delete/select own likes, anyone can count
```

**UI Changes:**
- Add a thumbs-up/like icon + count on each product card (Store, Catalog, FeaturedSection, ProductDetail)
- Add a share button (icon) that opens a dropdown/popover with: WhatsApp, Telegram, Instagram, TikTok, Facebook, X (Twitter), Reddit, Copy Link
- Share generates the URL `https://a3dtoprint.lovable.app/3dmodels/{slug}`
- Create a reusable `ShareMenu` component and `LikeButton` component

---

## 4. Product Reviews Section
**Database migration:** Create `product_reviews` table:
```sql
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  media jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
-- RLS: authenticated users can insert/update own reviews (with purchase validation via function)
-- Anyone can read reviews
```

Create a security definer function `has_purchased_product(user_id, product_id)` that checks if the user has an order with status 'confirmed', 'printing', 'shipped', or 'delivered' containing the product in order_items.

**UI Changes in `src/pages/ProductDetail.tsx`:**
- Add a Reviews section below the product info
- Display average rating + star breakdown
- List reviews with: user avatar/name, star rating, comment, media (images/videos), date
- "Write a Review" form (shown only if user has purchased): star selector, text area, image/video upload (to a `review-media` storage bucket)
- Show message "Purchase this product to leave a review" for non-purchasers

**Storage:** Create `review-media` bucket (public)

---

## 5. "Buy Online" button in Catalog dialog
**File:** `src/pages/Catalog.tsx` — in the dialog (lines 262-267), add a "Buy Online" button BEFORE the WhatsApp button:
- Links to `/3dmodels/{product.slug}` (the public product page)
- Styled with gold gradient to match the brand
- WhatsApp button stays below it

---

## Files Modified
1. `src/components/landing/HeroSection.tsx` — right column visual content
2. `src/pages/Store.tsx` — 2-col mobile grid, like/share buttons
3. `src/pages/Catalog.tsx` — 2-col mobile grid, like/share, "Buy Online" button in dialog
4. `src/components/landing/FeaturedSection.tsx` — 2-col mobile grid, like/share
5. `src/pages/ProductDetail.tsx` — like/share buttons, reviews section
6. `src/components/ShareMenu.tsx` — new reusable share dropdown
7. `src/components/LikeButton.tsx` — new reusable like button with count
8. `src/components/ProductReviews.tsx` — new reviews section component
9. `src/i18n/translations.ts` — new translation keys
10. **DB migration**: `product_likes` table, `product_reviews` table, `has_purchased_product` function, `review-media` bucket

## Implementation Order
1. Database migrations (likes table, reviews table, purchase check function, storage bucket)
2. Reusable components (ShareMenu, LikeButton, ProductReviews)
3. Hero section right-side redesign
4. Mobile grid updates across all product listing pages
5. Integrate like/share into all product cards and detail page
6. Reviews section in ProductDetail
7. "Buy Online" button in Catalog dialog
8. Translation keys

