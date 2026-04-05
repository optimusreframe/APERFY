

# Email Templates: Dark Theme + English Language

## Problem
1. The logo is invisible against the white background — needs a dark background
2. All emails are in Spanish, but there's no way to detect user language in auth email hooks (the payload doesn't include locale). Switching all to English as requested.

## Changes

### All 6 templates get the same style updates:

**Colors/Theme:**
- `main` background: `#0A0A0F` (dark, matches site)
- `card` background: `#13131A` with gold border `${gold}33`
- `brandName` color: `#ffffff`
- `h1` color: `#ffffff`
- `text` color: `#A0A0AB` (lighter muted for readability on dark)
- `footerText` color: `#666670`
- `footerBrand` color: `#666670`
- `button` color stays dark text on gold button (good contrast)
- `Html lang="en"`

**Content — English translations:**

| Template | Subject | Key text |
|----------|---------|----------|
| signup | Confirm your account | Welcome to the world of premium 3D printing |
| recovery | Reset your password | We received a request to reset your password |
| magic-link | Your login link | Click the button to access your account |
| invite | You've been invited | You've been invited to join 3DtoPrint |
| email-change | Confirm your new email | You requested to change your email address |
| reauthentication | Your verification code | Use this code to verify your identity |

### auth-email-hook/index.ts
- `EMAIL_SUBJECTS` already in English — no change needed

### Files to modify
- `supabase/functions/_shared/email-templates/signup.tsx`
- `supabase/functions/_shared/email-templates/recovery.tsx`
- `supabase/functions/_shared/email-templates/magic-link.tsx`
- `supabase/functions/_shared/email-templates/invite.tsx`
- `supabase/functions/_shared/email-templates/email-change.tsx`
- `supabase/functions/_shared/email-templates/reauthentication.tsx`

Then redeploy `auth-email-hook`.

