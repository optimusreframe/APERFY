

# Fix Admin Role & Hide User Options for Admin Users

## Problem
1. `andresperniaj@gmail.com` may have duplicate roles in the `user_roles` table, causing inconsistent behavior.
2. When logged in as admin, the navbar dropdown still shows regular user options (Profile, Orders, Favorites) alongside the Admin Panel link. Admin users should only see the Admin Panel option and Logout.

## Solution

### 1. Database Cleanup
Run a migration to:
- Delete any duplicate rows for this user in `user_roles`
- Add a UNIQUE constraint on `(user_id, role)` if not already present (schema shows it exists, but we verify and clean duplicates)

### 2. Navbar UI Update (`src/components/Navbar.tsx`)
- When `isAdmin === true`, hide the Profile/Orders/Favorites dropdown items
- Show only: **Admin Panel** link + **Logout**
- Keep the cart and language switcher visible for everyone

### 3. Auth Redirect
- In `src/pages/Auth.tsx` (or post-login logic): if user is admin, redirect to `/admin` instead of `/` after login

## Files Modified
1. **Database migration** — clean duplicate roles for the user
2. **`src/components/Navbar.tsx`** — conditionally hide user menu items when `isAdmin`
3. **`src/pages/Auth.tsx`** — redirect admin users to `/admin` after login

