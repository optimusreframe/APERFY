

# Phase 2: Database Schema + Authentication + Admin Panel

Per the plan, Phase 2 focuses on setting up the database, authentication, and the admin panel for product management. Since the DB is currently empty and there's no auth, we need to build the foundation first.

---

## 1. Database Schema (Migration)

Create all core tables in a single migration:

- **profiles** — `id (uuid FK auth.users)`, `full_name`, `avatar_url`, `phone`, `created_at`
- **categories** — `id`, `name_en`, `name_es`, `slug`, `icon`, `is_active`
- **materials** — `id`, `name_en`, `name_es`, `description_en`, `description_es`, `is_active`
- **products** — `id`, `name_en`, `name_es`, `description_en`, `description_es`, `slug`, `base_price`, `category_id (FK)`, `is_active`, `is_featured`, `images (jsonb)`, `created_at`, `updated_at`
- **product_materials** — join table `product_id`, `material_id`
- **product_variations** — `id`, `product_id (FK)`, `name_en`, `name_es`, `type` (color/size/material), `value`, `price_modifier`, `is_active`
- **user_roles** — `id`, `user_id (FK auth.users)`, `role (app_role enum: admin/user)`
- **has_role()** security definer function
- **Auto-create profile trigger** on auth.users insert
- RLS policies on all tables (public read for products/categories/materials, authenticated for profiles, admin-only for writes)

Create **storage bucket** `product-images` for product photos and `avatars` for profile pictures.

## 2. Authentication Pages

- **`/auth`** page with Login / Sign Up tabs (email + password)
- **`/reset-password`** page for password recovery flow
- **Auth context** wrapping the app to track session state
- Update **Navbar** to show user state (logged in → Dashboard/Logout, admin → Admin link)

## 3. Admin Panel (`/admin`)

Protected route — only accessible to users with `admin` role.

- **Layout**: Sidebar navigation (using SidebarProvider) with dark premium styling
- **Dashboard tab**: Placeholder metrics cards (total products, categories, materials)
- **Products tab**: 
  - Table listing all products with status, price, category
  - Add/Edit product form: name (EN/ES), description (EN/ES), base price, category, materials, images upload, is_active, is_featured
  - Delete product with confirmation
- **Variations tab** (within product edit): Add/edit/delete variations with type, value, price modifier
- **Categories tab**: CRUD for categories (name EN/ES, slug, icon, active toggle)
- **Materials tab**: CRUD for materials (name EN/ES, description EN/ES, active toggle)

## 4. i18n Expansion

Add all new translation keys for auth forms, admin panel labels, validation messages, and error states to `translations.ts`.

## 5. Routing Updates

Add routes in `App.tsx`:
- `/auth` → Auth page
- `/reset-password` → Password reset
- `/admin` → Admin layout with nested routes (dashboard, products, categories, materials)
- Protected route wrapper checking admin role

---

## Technical Notes

- Product images stored in `product-images` bucket, URLs saved as JSONB array in `products.images`
- Admin role checked via `has_role()` security definer function to avoid RLS recursion
- All admin mutations use React Query with optimistic updates
- Forms use react-hook-form for validation
- Admin sidebar uses shadcn Sidebar component with gold accent styling

