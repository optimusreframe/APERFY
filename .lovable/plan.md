

# Catalog Improvements

## Changes

### 1. Remove WhatsApp button from catalog grid — Add product detail dialog

**File: `src/pages/Catalog.tsx`**

- Remove the WhatsApp button from each product card in the grid
- Make the entire card clickable → opens a `Dialog` with full product details
- Dialog content:
  - Image gallery (all product images, clickable thumbnails)
  - Full product name, full description (no truncation)
  - Category badge, price, materials list
  - WhatsApp "Order" button at the bottom of the dialog
- Query `product_materials` + `materials` and `product_variations` for the selected product inside the dialog

### 2. Fix WhatsApp URL to use published domain

**File: `src/pages/Catalog.tsx`**

- Change `window.location.origin` to the published URL `https://a3dtoprint.lovable.app` so the WhatsApp message always contains the real public URL, not the Lovable preview URL.
- Update the URL pattern: `https://a3dtoprint.lovable.app/3dmodels/${product.slug}`

### 3. Also fix in `ProductDetail.tsx` if similar pattern exists

Check if `ProductDetail.tsx` has any WhatsApp or sharing URLs using `window.location.origin` — it doesn't appear to, so no change needed there.

## Technical Details

- Use shadcn `Dialog` component for the product detail modal
- Fetch additional product data (materials, variations) on dialog open using inline queries
- No database changes needed
- No new files needed — all changes in `src/pages/Catalog.tsx`

