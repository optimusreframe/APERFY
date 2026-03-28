

# Phase 7: Security Hardening

## Overview
Implement application-level security across the stack: input validation, rate limiting, file upload protection, security headers, and XSS prevention. Infrastructure-level DDoS protection is already provided by the hosting platform and backend infrastructure (Cloudflare, load balancers). This phase focuses on what we control at the code level.

---

## 1. Input Validation with Zod (All Forms)

**New file: `src/lib/validation.ts`**
- Define Zod schemas for all user inputs:
  - `checkoutSchema`: fullName (max 100), phone (pattern), address (max 255), city (max 100), notes (max 500)
  - `profileSchema`: fullName (max 100), phone (optional, pattern)
  - `authSchema`: email (valid email), password (min 6, max 72), fullName (max 100)
  - `contactSchema` / admin forms: name fields (max 255), slug (alphanumeric + hyphens), price (positive number)

**Edit files**: `Checkout.tsx`, `Profile.tsx`, `Auth.tsx`, `AdminProducts.tsx`, `AdminCategories.tsx`, `AdminMaterials.tsx`
- Validate all form data through Zod before submission
- Show field-level error messages
- Sanitize text inputs (trim whitespace, strip HTML tags)

## 2. File Upload Security

**Edit: `Profile.tsx` (avatar), `AdminProducts.tsx` (product images)**
- Validate file type via MIME type AND extension (only allow `image/jpeg`, `image/png`, `image/webp`)
- Enforce max file size: 2MB for avatars, 5MB for product images
- Sanitize file names (remove special characters)
- Validate file content by checking magic bytes (file signature)

## 3. Rate Limiting Utility (Client-Side Throttle)

**New file: `src/lib/rate-limit.ts`**
- Simple in-memory rate limiter for sensitive actions
- Prevent rapid-fire form submissions (auth, checkout, profile save)
- Configurable: max attempts per time window
- Applied to: login, signup, password reset, order placement, profile save

## 4. Edge Function Security Hardening

**Edit: `supabase/functions/ai-product-from-url/index.ts`**
- Add Zod input validation for URL and description fields
- Validate URL format (must be valid HTTP/HTTPS URL)
- Add request size limit check
- Sanitize AI prompt inputs to prevent prompt injection

## 5. Security Headers

**New file: `public/_headers` (or via `vite.config.ts` plugin)**
- Content-Security-Policy: restrict script sources, disable inline scripts where possible
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY (prevent clickjacking)
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: restrict camera, microphone, geolocation

**Edit: `index.html`**
- Add CSP meta tag as fallback
- Add `rel="noopener noreferrer"` to all external links

## 6. XSS Prevention

**New file: `src/lib/sanitize.ts`**
- HTML sanitization utility using DOMPurify (add as dependency)
- Apply to all user-generated text that gets rendered (product descriptions from AI, order notes, profile names)
- Ensure no `dangerouslySetInnerHTML` usage without sanitization

**Audit existing code** for:
- Template literal injection in URLs
- Unsanitized user input in `href`, `src`, or dynamic attributes

## 7. Auth Hardening

**Edit: `src/contexts/AuthContext.tsx`**
- Add session timeout: auto-logout after extended inactivity (e.g., 30 min idle)
- Clear sensitive data from memory on sign-out (cart is fine to keep, but auth tokens must go)

**Edit: `src/pages/Auth.tsx`**
- Add login attempt throttling (max 5 attempts per 5 minutes, show cooldown message)
- Disable submit button during cooldown
- Mask error messages to prevent user enumeration (generic "Invalid credentials" instead of "User not found")

## 8. Cart Data Integrity

**Edit: `src/contexts/CartContext.tsx`**
- Validate cart data shape when loading from localStorage (Zod schema)
- Reject corrupted/tampered cart data gracefully (reset to empty)
- Validate price data against server on checkout (re-fetch product prices before order submission)

**Edit: `src/pages/Checkout.tsx`**
- Before placing order: re-fetch current prices from DB and compare with cart
- If prices changed, notify user and update cart
- Prevents price manipulation via localStorage tampering

## 9. Admin Protection Audit

**Edit: `src/components/ProtectedRoute.tsx`**
- Add logging for unauthorized admin access attempts
- Redirect with toast message explaining why access was denied

## Files Summary

| Action | File |
|--------|------|
| Create | `src/lib/validation.ts` — Zod schemas for all forms |
| Create | `src/lib/rate-limit.ts` — client-side rate limiter |
| Create | `src/lib/sanitize.ts` — XSS sanitization utility |
| Edit | `src/pages/Auth.tsx` — login throttling, error masking |
| Edit | `src/pages/Checkout.tsx` — input validation, price verification |
| Edit | `src/pages/Profile.tsx` — input validation, upload security |
| Edit | `src/contexts/AuthContext.tsx` — session timeout |
| Edit | `src/contexts/CartContext.tsx` — data integrity validation |
| Edit | `src/pages/admin/AdminProducts.tsx` — validation, upload security |
| Edit | `src/components/ProtectedRoute.tsx` — access denied feedback |
| Edit | `supabase/functions/ai-product-from-url/index.ts` — input validation |
| Edit | `index.html` — CSP meta tag |
| Dep | `dompurify` + `@types/dompurify` |

