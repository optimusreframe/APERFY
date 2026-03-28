

# Phase 4: Shopping Cart & Order Flow

## Overview

Add a cart system, checkout flow, and order management. Users can add products (with selected variations) to a persistent cart, review their order, and submit it. Admins can view and manage orders from the admin panel.

---

## 1. Database Changes (Migration)

**New tables:**

- **orders** — `id (uuid)`, `user_id (uuid, FK auth.users via profiles pattern)`, `status (order_status enum: pending/confirmed/printing/shipped/delivered/cancelled)`, `total (numeric)`, `notes (text)`, `shipping_address (jsonb)`, `created_at`, `updated_at`
- **order_items** — `id (uuid)`, `order_id (uuid FK orders)`, `product_id (uuid FK products)`, `quantity (int)`, `unit_price (numeric)`, `selected_variations (jsonb)`, `notes (text)`

**RLS policies:**
- Users can INSERT their own orders and SELECT their own orders
- Admins can SELECT/UPDATE all orders (manage status)
- Order items follow parent order's access

**Enum:** `create type public.order_status as enum ('pending','confirmed','printing','shipped','delivered','cancelled');`

## 2. Cart System (Client-Side with Context)

**New file: `src/contexts/CartContext.tsx`**
- Cart state stored in localStorage (no auth required to browse/add)
- Cart items: `{ productId, productName, productImage, slug, quantity, unitPrice, selectedVariations, notes }`
- Actions: addToCart, removeFromCart, updateQuantity, clearCart, getTotal
- Wrap app with `<CartProvider>`

## 3. New Pages

### `/cart` — Cart Page (`src/pages/Cart.tsx`)
- List of cart items with image, name, variations, quantity +/- controls, price, remove button
- Order summary sidebar: subtotal, total
- "Proceed to Checkout" button (requires auth — redirect to `/auth` if not logged in)
- Empty cart state

### `/checkout` — Checkout Page (`src/pages/Checkout.tsx`)
- Protected route (authenticated users only)
- Shipping address form (name, phone, address, city, notes)
- Order summary (readonly cart items)
- "Place Order" button → inserts into `orders` + `order_items`, clears cart, redirects to confirmation
- Success toast + redirect to `/orders`

### `/orders` — My Orders (`src/pages/Orders.tsx`)
- Protected route
- List of user's orders with status badge, date, total, item count
- Click to expand → order items detail

## 4. Admin: Orders Management

**New file: `src/pages/admin/AdminOrders.tsx`**
- Table of all orders with user info, status, total, date
- Status update dropdown (pending → confirmed → printing → shipped → delivered)
- Click to expand order items
- Add route to AdminLayout + AdminSidebar

## 5. UI Updates

- **ProductDetail.tsx**: Wire "Add to Cart" button to CartContext (currently placeholder)
- **Navbar.tsx**: Add cart icon with item count badge, link to `/cart`
- **Store.tsx**: Add "Add to Cart" quick button on product cards

## 6. Translations

Add keys for: cart (empty, items, total, checkout, remove), orders (status labels, my orders, place order), checkout form labels, admin order management.

## 7. Routing

Add to `App.tsx`:
- `/cart` → Cart
- `/checkout` → Checkout (protected)
- `/orders` → Orders (protected)
- `/admin/orders` → AdminOrders

## 8. Files Summary

| Action | File |
|--------|------|
| Create | `src/contexts/CartContext.tsx` |
| Create | `src/pages/Cart.tsx` |
| Create | `src/pages/Checkout.tsx` |
| Create | `src/pages/Orders.tsx` |
| Create | `src/pages/admin/AdminOrders.tsx` |
| Edit | `src/App.tsx` — new routes |
| Edit | `src/main.tsx` or `App.tsx` — wrap CartProvider |
| Edit | `src/pages/ProductDetail.tsx` — wire Add to Cart |
| Edit | `src/pages/Store.tsx` — quick add to cart |
| Edit | `src/components/Navbar.tsx` — cart icon + badge |
| Edit | `src/pages/admin/AdminLayout.tsx` — orders route |
| Edit | `src/pages/admin/AdminSidebar.tsx` — orders link |
| Edit | `src/i18n/translations.ts` — new keys |
| Migration | orders, order_items tables + enum |

