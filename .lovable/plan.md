

# Fix: AI Image Error Reporting + Log Registration

## Root Cause Analysis

**Why you got the error**: The Groot image triggered `IMAGE_PROHIBITED_CONTENT` — the AI's content filter flagged it as a copyrighted character (Marvel/Disney). The edge function correctly detected this and returned a descriptive error message... BUT with HTTP status **422**.

**Why the error message was generic**: `supabase.functions.invoke()` treats any non-2xx response as a failure. When the edge function returns 422, the SDK sets `error.message = "Edge Function returned a non-2xx status code"` and the response body (with the detailed Spanish error message) is lost in `data` or inaccessible.

**Why no log was recorded**: The `handleEditAiGenerateImage` function (edit dialog) has no `logActivity()` call in its catch block — unlike `triggerAiGenerateImage` (create dialog) which does.

## Fixes (3 changes)

### 1. Edge function: Return 200 with `success: false` instead of 422

In `supabase/functions/ai-product-import/index.ts`, change the error response at line 548-556 from status `422` to `200`. This way `supabase.functions.invoke()` won't throw, and the client can read `data.error` with the descriptive message.

Same pattern for the non-2xx responses at lines 504-511 — return 200 with `success: false` instead of throwing.

### 2. AdminProducts: Better error extraction + log in edit handler

In `handleEditAiGenerateImage` (line 822):
- Already checks `if (error) throw ...` but `data?.error` is undefined when status is non-2xx
- After fix #1, this will work because data will contain the error message
- Add `logActivity()` call in the catch block (same as `triggerAiGenerateImage` already has)

### 3. AdminProducts: Same fix for `triggerAiGenerateImage` (line 645-648)

Already has logActivity, but error extraction will now work correctly after fix #1.

## Files to modify

- `supabase/functions/ai-product-import/index.ts` — change status 422 to 200 for image generation errors; also handle the `throw new Error("AI image generation failed")` case at line 510 to return a proper response instead of throwing
- `src/pages/admin/AdminProducts.tsx` — add `logActivity()` to `handleEditAiGenerateImage` catch block

## About the Groot image

The `IMAGE_PROHIBITED_CONTENT` filter blocks copyrighted characters. After these fixes, when you try to generate an image for Groot, you'll see a clear message: "La IA detectó contenido prohibido en la imagen. Intenta con otra imagen fuente." — and it will be logged. The workaround is to use a photo taken from a different angle or with less recognizable framing, though this may still trigger the filter for well-known characters.

