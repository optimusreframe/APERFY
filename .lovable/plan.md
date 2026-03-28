

# Phase 3: Store, Catalog, Favorites, Sample Data, AI Product Import

## Overview

Build the `/3dmodels` store page, `/catalog` P2P page, product detail view, favorites system, seed sample products, and add an AI-powered "Add from Reference" feature in the admin panel.

---

## 1. Database Changes (Migration)

**New table: `favorites`**
- `id` uuid PK
- `user_id` uuid (references auth.users)
- `product_id` uuid (references products)
- `created_at` timestamptz
- Unique constraint on (user_id, product_id)
- RLS: authenticated users can manage their own favorites, read own only

**Seed data** (via insert tool, not migration):
- 3 categories: Figurines, Home Decor, Accessories
- 4 materials: PLA, ABS, PETG, TPU
- 8 sample products with realistic names/descriptions in EN/ES, prices, assigned categories, `is_active: true`, mix of `is_featured`
- Product variations for some products (color, size)

## 2. Edge Function: `ai-product-from-url`

Backend function that:
1. Receives a URL from the admin
2. Uses Firecrawl (if connected) or fetches page content
3. Sends scraped content to Lovable AI (Gemini) with a prompt to extract: product name (EN/ES), description (EN/ES), suggested slug, suggested price, suggested category
4. Returns structured JSON for the admin to review before saving

Since we don't have Firecrawl connected, we'll use Lovable AI directly — the admin pastes URL + description text, AI generates bilingual product data.

## 3. New Pages & Components

### `/3dmodels` — Store Page (`src/pages/Store.tsx`)
- **Top bar**: Search input + sort dropdown (newest, price asc/desc, popular)
- **Sidebar** (left, collapsible on mobile): Category filter, Material filter, Price range slider
- **Grid**: 4 columns on desktop, 2 on tablet, 1 on mobile
- **Product cards**: Image, name, price, category badge, favorite heart button, click → product detail
- Queries `products` table with filters, joins categories

### `/3dmodels/:slug` — Product Detail (`src/pages/ProductDetail.tsx`)
- Image gallery (thumbnails + main image)
- Name, description, price
- Variation selectors (color/size/material chips)
- Quantity selector
- Special notes textarea
- "Add to Cart" button (placeholder for Phase 6)
- "Save to Favorites" toggle (requires auth)
- Related products row at bottom
- Inspired by MakerWorld product page

### `/catalog` — P2P Catalog (`src/pages/Catalog.tsx`)
- Same product grid as store but no cart functionality
- Not linked in navbar (URL-only access)
- Each product has "Order via WhatsApp" button
- WhatsApp link: `wa.me/16893324656` with pre-loaded message in user's language
- Message includes model name, description, and URL

### Admin: "Add from Reference" Dialog (`AdminProducts.tsx` update)
- New button "Add from Reference" next to "Add Product"
- Dialog with: URL input, image upload, "Generate with AI" button
- Calls edge function, returns pre-filled form
- Admin reviews/edits, then saves

## 4. Landing Page Update

Update `FeaturedSection.tsx` to query real products from DB (featured + active) instead of hardcoded DEMO_MODELS.

## 5. Translations

Add keys for catalog page, AI import UI, and any missing store/product labels.

## 6. Routing

Add to `App.tsx`:
- `/3dmodels` → Store
- `/3dmodels/:slug` → ProductDetail
- `/catalog` → Catalog

## 7. Files to Create/Edit

| Action | File |
|--------|------|
| Create | `src/pages/Store.tsx` |
| Create | `src/pages/ProductDetail.tsx` |
| Create | `src/pages/Catalog.tsx` |
| Create | `supabase/functions/ai-product-from-url/index.ts` |
| Edit | `src/App.tsx` — add routes |
| Edit | `src/pages/admin/AdminProducts.tsx` — add AI import dialog |
| Edit | `src/components/landing/FeaturedSection.tsx` — use real DB data |
| Edit | `src/i18n/translations.ts` — new keys |
| Migration | Create favorites table |
| Insert | Seed categories, materials, products |

