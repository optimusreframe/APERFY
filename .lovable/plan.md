

# Upgrade AI Image Generation Prompt — Premium Branded Background

## What Changes

### 1. Edge Function: Enhanced Premium Prompt (`supabase/functions/ai-product-import/index.ts`)

Replace the current `defaultBgPrompt` (line 175) with the detailed museum-grade exhibition prompt provided. The new prompt describes:
- Dark polished concrete + brushed metal plinth
- Recessed lighting with contact shadows
- Minimalist dark architectural space with geometric patterns
- Warm white + electric cobalt blue light lines
- Laser-etched "3DtoPrint" logo on the plinth base
- Shallow depth of field for premium feel

Also add category-aware prompt variations:
- **Figure/Decoration**: Gallery-style glass + dark wood plinth, diffused lighting, white walls
- **Functional/Engineering**: Technical grid surface, cyan/orange lines, engineering stamp logo
- **Default**: The versatile museum-grade prompt

To support this, the `generate_image` action will accept an optional `productCategory` field from the frontend.

### 2. Frontend: Pass Category to Image Generation (`src/pages/admin/AdminProducts.tsx`)

In `handleAiGenerateImage` (line 420), add `productCategory` to the request body, derived from `aiData.suggested_category` or the matched category name. This lets the edge function select the appropriate prompt variation.

Update the request body at line 438-444:
```typescript
body: {
  action: 'generate_image',
  sourceImage,
  customBackground,
  backgroundMode,
  productCategory: aiData?.suggested_category || '',
},
```

### 3. Edge Function: Category-Based Prompt Selection

In the `generate_image` action, add logic after line 176:
```typescript
const { sourceImage, customBackground, backgroundMode, productCategory } = body;

// Select prompt based on category
const cat = (productCategory || '').toLowerCase();
let defaultBgPrompt: string;

if (['figuras', 'figures', 'decoracion', 'decoration'].some(k => cat.includes(k))) {
  defaultBgPrompt = `A photo of a museum gallery exhibit...`; // Gallery variant
} else if (['funcional', 'functional', 'engineering', 'herramientas'].some(k => cat.includes(k))) {
  defaultBgPrompt = `A high-end engineering schematics surface...`; // Engineering variant
} else {
  defaultBgPrompt = `A high-resolution, museum-grade photo of a professional exhibition plinth...`; // Default premium
}
```

Each variant ends with the instruction to place the extracted product centrally with realistic shadows.

## Files Modified
1. **`supabase/functions/ai-product-import/index.ts`** — Replace default prompt with 3 category-aware premium prompts
2. **`src/pages/admin/AdminProducts.tsx`** — Pass `productCategory` in the `generate_image` request

