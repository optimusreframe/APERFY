

# AI Import Studio Improvements

## Overview
Seven improvements to the AI Import Studio and product management in `AdminProducts.tsx` plus the edge function.

## Changes

### 1. Better AI Image Generation Prompt (Edge Function)
**File: `supabase/functions/ai-product-import/index.ts`**
- Update the default background prompt to describe a product display/exhibition stand with the "3DtoPrint" watermark/brand name
- When custom background is provided, still instruct AI to add "3DtoPrint" watermark
- Improve prompt to explicitly say "place the object on a display stand/pedestal" style

### 2. System-Level Custom Background Setting
**Database**: Create a new `admin_settings` table with key-value pairs to store a system-wide custom background image URL.
**File: `AdminProducts.tsx`**:
- Add background mode selector in AI Import source step: radio/select with 3 options:
  1. "Usar background del sistema" (use stored system background)
  2. "Generar con AI" (let AI create one)
  3. "Subir background personalizado" (upload for this product only)
- Fetch system background from `admin_settings` table on load
- In the Admin Dashboard or a new Settings section, allow uploading/updating the system background

### 3. Category: Inline Creation + AI Auto-Selection
**File: `AdminProducts.tsx`**:
- In the AI Import review step Category select, add an option "+ Crear nueva categoría" that opens an inline input to create a new category (inserts into `categories` table)
- AI scrape response already includes `suggested_category` — update the edge function to return the actual category slug from existing DB categories or suggest a new one
- After scrape, auto-match to existing category or prompt to create

### 4. Materials & Colors as Multi-Select Dropdowns
**File: `AdminProducts.tsx`**:
- Fetch `materials` table data
- Replace text inputs for Materials with a multi-select dropdown (checkboxes) populated from the `materials` table
- Colors: use a multi-select with common 3D printing colors as options (hardcoded list + ability to type custom)
- AI auto-selects matching options after scrape

### 5. Auto-Generate Slug from Name
**File: `AdminProducts.tsx`**:
- When `aiData.name_es` changes, auto-generate slug (lowercase, replace spaces with hyphens, remove special chars)
- Make slug field read-only but with an edit toggle if admin wants to customize

### 6. Spanish-First UI with English Toggle
**File: `AdminProducts.tsx`**:
- In AI Import review step, show only Spanish fields by default (Nombre, Descripción)
- Add a toggle "Generar versión en inglés" — when enabled, show EN fields and auto-populate via AI
- The edge function already generates both languages; just control visibility in UI

### 7. Delete Button on Extracted Image Thumbnails
**File: `AdminProducts.tsx`**:
- Add X/trash icon on each thumbnail in `aiExtractedImages` grid so admin can remove unwanted scraped images

## Files Modified
1. `supabase/functions/ai-product-import/index.ts` — improve image gen prompt with display stand + 3DtoPrint watermark
2. `src/pages/admin/AdminProducts.tsx` — all UI changes (background mode, category creation, multi-selects, slug auto-gen, Spanish-first, thumbnail delete)
3. **Database migration** — create `admin_settings` table for system background

## Implementation Order
1. Database migration for `admin_settings`
2. Update edge function prompt
3. Update AdminProducts.tsx with all UI improvements

