

# Fix AI Import Image Behavior

## Problems Identified
1. **No auto-generation**: After scraping a URL, the system only shows original images and a "Generar Imagen AI" button. The AI image should be generated automatically right after the scrape completes.
2. **Thumbnail click doesn't update large preview**: Clicking a thumbnail selects it as "source image" but the large preview area only shows `aiGeneratedImage` or the source image with opacity — it doesn't swap to show the clicked thumbnail full-size.

## Solution

### 1. Auto-generate AI image after scrape (`AdminProducts.tsx`)
In `handleAiScrape` (line 382), after the scrape succeeds and `aiStep` is set to `'review'`, automatically trigger `handleAiGenerateImage()`. This way, when the review step appears, the AI-generated image is already being created — no manual click needed.

```typescript
// After line 411 (setAiStep('review'))
// Auto-trigger image generation
setTimeout(() => handleAiGenerateImage(), 100);
```

Since `handleAiGenerateImage` depends on `aiSelectedSourceImage` being set (done on line 409), we call it after state has been set.

### 2. Thumbnail click shows full-size preview (`AdminProducts.tsx`)
Currently (line 762-771), the large preview prioritizes `aiGeneratedImage`, then falls back to source. The thumbnails only set the source image — they don't affect the large preview when a generated image exists.

**Fix**: Add a new state `aiPreviewImage` that tracks which image to show in the large area. When clicking a thumbnail, set `aiPreviewImage` to that thumbnail's URL. When AI generates a new image, set `aiPreviewImage` to the generated image.

- Add state: `const [aiPreviewImage, setAiPreviewImage] = useState<string | null>(null);`
- On thumbnail click: `setAiPreviewImage(img)` alongside existing source selection
- On AI generation complete (line 449): `setAiPreviewImage(data.data.generated_image)`
- Large preview area (line 762): show `aiPreviewImage || aiGeneratedImage || aiSelectedSourceImage || aiOriginalImage`

## Files Modified
1. **`src/pages/admin/AdminProducts.tsx`** — Add `aiPreviewImage` state, auto-trigger generation after scrape, update thumbnail click and preview logic

