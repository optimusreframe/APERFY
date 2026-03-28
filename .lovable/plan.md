

# Phase 8: Content Update, Custom Model Request System & 3D Visual Enhancement

## Overview

Three areas of work: (1) update all copy to clarify you only print published models, (2) build a full "Request a Model" feature with file uploads and admin notifications, (3) enhance the landing page with richer 3D visuals, animations, and themed elements.

---

## 1. Content & Copy Updates

**Files: `src/i18n/translations.ts`, landing sections**

Update all messaging that implies custom design services:
- Hero subtitle: remove "request a custom design" language, emphasize browsing/purchasing published models
- HowItWorks Step 1: change from "request a custom design" to "browse our collection and pick your model"
- HowItWorks Step 2: keep customization of material/color/size but remove "tailored to your needs" design language
- Add a new "Can't find what you need?" CTA pointing to the Request a Model page

---

## 2. Custom Model Request System

### 2a. Database Migration

New table: `model_requests`
- `id` (uuid, PK)
- `name` (text) — requester's name
- `email` (text) — requester's email
- `phone` (text) — requester's phone
- `product_name` (text) — desired model name
- `description` (text, nullable) — notes/details
- `reference_url` (text, nullable) — reference URL
- `images` (jsonb, default []) — uploaded image URLs
- `status` (text, default 'pending') — pending/reviewing/fulfilled/rejected
- `fulfilled_product_id` (uuid, nullable) — link to product when fulfilled
- `created_at`, `updated_at`

RLS: Authenticated users can INSERT their own requests, anon cannot. Admins can SELECT/UPDATE all.

New storage bucket: `model-request-images` (public).

### 2b. Request a Model Page (`/request-model`)

**New file: `src/pages/RequestModel.tsx`**
- Drag-and-drop image upload area (multiple images, max 5MB each, validated MIME types)
- Fields: name, email, phone (required), product name (required), description (textarea), reference URL
- Zod validation on all fields
- On submit: upload images to storage, insert row into `model_requests`, show success toast
- No auth required (public form, but captures contact info)
- Bilingual (EN/ES) with all text from translations

### 2c. Admin: Manage Requests

**New file: `src/pages/admin/AdminRequests.tsx`**
- List all model requests with status badges
- View request details (images, notes, URL)
- Update status (pending → reviewing → fulfilled/rejected)
- When marking "fulfilled": select a product from the store to link, which triggers an email to the requester

**Edit: `src/pages/admin/AdminSidebar.tsx`** — add "Requests" link
**Edit: `src/pages/admin/AdminLayout.tsx`** — add route

### 2d. Email Notification on Fulfillment

**New edge function or direct invocation**: When admin marks a request as "fulfilled" and links a product, send an email to the requester with the product name, image, and a direct link button to the product page. This will use Lovable's email infrastructure.

### 2e. Navbar & Footer

- Add "Request a Model" link in Navbar and Footer

---

## 3. Landing Page 3D Visual Enhancement

### 3a. New Section: `RequestCTASection`

**New file: `src/components/landing/RequestCTASection.tsx`**
- "Can't find your model?" call-to-action section between Stats and Footer
- 3D-themed illustration (CSS 3D transforms, animated geometric shapes)
- Link to `/request-model`

### 3b. Enhanced HeroSection

- Add more floating 3D geometric shapes (tetrahedron, sphere wireframe, torus) using CSS 3D transforms
- Add layered particle system (more particles, varied sizes)
- Add subtle rotating grid/wireframe background effect
- Improve the animated 3D cube with more faces and depth

### 3c. Enhanced HowItWorksSection

- Add 3D-styled step cards with perspective transforms on hover
- Add animated connecting lines between steps (dotted path with animated dash offset)
- Add floating 3D icons that rotate/pulse

### 3d. Enhanced MaterialsSection

- Add 3D filament spool illustrations (CSS 3D transforms)
- Cards tilt on hover (3D perspective effect)
- Add subtle layer/depth effects with shadows

### 3e. Enhanced StatsSection

- Add animated counter effect (numbers count up when in view)
- 3D card hover effects (perspective tilt)
- Add floating 3D decorative elements

### 3f. New CSS Animations

**Edit: `tailwind.config.ts`** and **`src/index.css`**
- Add `rotate-3d` keyframe animation
- Add `tilt-card` hover perspective effect
- Add `wireframe-spin` for background wireframe elements
- Add `count-up` animation utility

---

## 4. Routing & Translations

**Edit: `src/App.tsx`** — add `/request-model` route (public, no auth required)

**Edit: `src/i18n/translations.ts`** — add keys for:
- `requestModel` section (page title, subtitle, form labels, placeholders, success message, CTA)
- `admin.requests` section (list title, status labels, fulfill action)
- Update `howItWorks` step descriptions to remove custom design language
- Update `hero.subtitle` to remove custom design language

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/pages/RequestModel.tsx` — public request form with drag-drop upload |
| Create | `src/pages/admin/AdminRequests.tsx` — admin request management |
| Create | `src/components/landing/RequestCTASection.tsx` — CTA section |
| Edit | `src/pages/Index.tsx` — add RequestCTASection |
| Edit | `src/components/landing/HeroSection.tsx` — enhanced 3D visuals |
| Edit | `src/components/landing/HowItWorksSection.tsx` — 3D cards, updated copy |
| Edit | `src/components/landing/MaterialsSection.tsx` — 3D hover effects |
| Edit | `src/components/landing/StatsSection.tsx` — counters, 3D effects |
| Edit | `src/components/Navbar.tsx` — add Request link |
| Edit | `src/components/Footer.tsx` — add Request link |
| Edit | `src/pages/admin/AdminLayout.tsx` — add requests route |
| Edit | `src/pages/admin/AdminSidebar.tsx` — add requests link |
| Edit | `src/App.tsx` — add /request-model route |
| Edit | `src/i18n/translations.ts` — new keys, updated copy |
| Edit | `tailwind.config.ts` — new 3D animations |
| Edit | `src/index.css` — new utility classes |
| Migration | Create `model_requests` table + RLS |
| Migration | Create `model-request-images` storage bucket |

