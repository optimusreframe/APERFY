

# Advanced Product Management & AI Import Redesign

## Part 1: Multi-Media Upload System (Add/Edit Product Dialog)

### Changes to `AdminProducts.tsx`
- Replace single `imageFile` state with `mediaFiles: { file: File; preview: string; id: string }[]` array (max 5)
- Move media upload zone to the TOP of the dialog, before name fields
- Accept: `image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm` (update validation accordingly)
- Drop zone UI: dashed border area with "Drag & drop or click to upload" + icons for photo/gif/video
- Show uploaded files as draggable thumbnail grid:
  - Images/GIFs: show preview thumbnail
  - Videos: show first-frame thumbnail or video icon overlay
  - Each thumbnail has an X button to remove
  - Drag-to-reorder using HTML5 drag events (no extra library needed — `onDragStart`, `onDragOver`, `onDrop` with index swapping)
- When editing existing product, pre-populate thumbnails from existing `product.images` URLs + allow adding new ones up to 5 total
- On save: upload new files to storage, merge with existing URLs in correct order

### Changes to `src/lib/validation.ts`
- Add `validateMediaFile()` function that accepts images, GIFs, and videos (max 20MB for video, 5MB for images/GIFs)
- Add GIF magic bytes + video MIME validation

## Part 2: Advanced AI Import — Full-Page Dialog

Replace the basic AI Import dialog with a multi-step, full-width premium wizard.

### New Edge Function: `supabase/functions/ai-product-import/index.ts`
Complete rewrite with these capabilities:
1. **Scrape the URL** — use Firecrawl if available, otherwise fetch + parse HTML for title/description/images using the AI model
2. **Generate unique product name** (EN/ES) — not similar to original
3. **Generate short description** (EN/ES) — based on original
4. **Extract materials & colors** from the reference page
5. **Extract original product image URL** from the scraped page
6. **Generate AI product image** — use `google/gemini-3.1-flash-image-preview` (Nano Banana 2) to:
   - Take the extracted/uploaded original product image
   - Extract the 3D object from it
   - Place it on a branded 3DtoPrint background (admin can upload custom background, or use default dark+gold gradient)
   - Return the generated image as base64

### AI Import Dialog UI (in `AdminProducts.tsx`)
Full-screen dialog with steps/sections:

```text
┌──────────────────────────────────────────────┐
│ ✨ AI Product Import Studio                   │
├──────────────────────────────────────────────┤
│                                              │
│ STEP 1: Source                               │
│ [Reference URL input]                        │
│ —OR—                                         │
│ [Upload original product photo]              │
│ [Upload custom background (optional)]        │
│                                              │
│ [🚀 Extract & Generate with AI]              │
│                                              │
│ STEP 2: Review & Edit (after AI generates)   │
│ ┌─────────────┬────────────────────────┐     │
│ │ AI Generated│ Name EN: [editable]    │     │
│ │   Image     │ Name ES: [editable]    │     │
│ │  (preview)  │ Desc EN: [editable]    │     │
│ │             │ Desc ES: [editable]    │     │
│ │ [Regenerate]│ Materials: [editable]  │     │
│ │             │ Colors: [editable]     │     │
│ │             │ Price: [editable]      │     │
│ │             │ Category: [select]     │     │
│ └─────────────┴────────────────────────┘     │
│                                              │
│ [💾 Save Product]                             │
└──────────────────────────────────────────────┘
```

- After AI generates, all fields are editable inline
- The AI-generated image is shown as a large preview with a "Regenerate Image" button
- Admin can swap the background image and regenerate
- On save: uploads the AI image to storage, creates product with all data

### Edge Function Flow
1. Receive `{ url?, originalImage? (base64), customBackground? (base64) }`
2. If URL provided: scrape page content (title, description, images, materials info) via AI text extraction
3. Generate unique product name + description using text AI (`google/gemini-3-flash-preview`)
4. Extract materials & colors from scraped content
5. Get the original product image (from URL scrape or admin upload)
6. Call `google/gemini-3.1-flash-image-preview` with the original image + instructions to isolate the 3D object and place it on the branded background
7. Return all data + generated image base64

## Files Modified
1. **`src/pages/admin/AdminProducts.tsx`** — Complete redesign of both dialogs (add/edit + AI import)
2. **`src/lib/validation.ts`** — Add `validateMediaFile()` for GIF/video support
3. **`supabase/functions/ai-product-import/index.ts`** — New advanced edge function replacing `ai-product-from-url`
4. **`supabase/functions/ai-product-from-url/index.ts`** — Keep as fallback, or delete

## Implementation Order
1. Update validation for multi-media support
2. Redesign Add/Edit Product dialog with multi-upload + drag-reorder
3. Create new `ai-product-import` edge function with full pipeline
4. Build the AI Import Studio dialog UI

