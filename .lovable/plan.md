

# Fix: Admin Page Refresh Causes "Access Denied"

## Root Cause

Race condition in `AuthContext.tsx`. When the page refreshes:

1. `onAuthStateChange` fires with a valid session
2. `checkAdmin()` is called via `setTimeout(..., 0)` (async, deferred)
3. `setLoading(false)` runs **immediately** on line 72 — before `checkAdmin` finishes
4. `ProtectedRoute` sees `loading=false`, `user=exists`, `isAdmin=false` → redirects to `/` with "Access denied"

The admin role check hasn't completed yet when the loading state is already `false`.

## Fix: `src/contexts/AuthContext.tsx`

1. Make `checkAdmin` return a promise and **await it before setting loading to false**
2. In `onAuthStateChange`: replace `setTimeout(() => checkAdmin(...), 0)` + `setLoading(false)` with `await checkAdmin(...)` then `setLoading(false)`
3. In `getSession()`: same — `await checkAdmin(...)` before `setLoading(false)`

```typescript
// Before (broken):
if (session?.user) {
  setTimeout(() => checkAdmin(session.user.id), 0);
}
setLoading(false);

// After (fixed):
if (session?.user) {
  await checkAdmin(session.user.id);
}
setLoading(false);
```

This ensures `isAdmin` is set correctly before `ProtectedRoute` evaluates the redirect condition.

## Files Modified
1. `src/contexts/AuthContext.tsx` — await checkAdmin before clearing loading state

