

# Fix: Admin Role Check Deadlock in AuthContext

## Problem

The `await checkAdmin()` inside `onAuthStateChange` is causing a deadlock. Supabase's auth state change listener should not make async Supabase queries — the client can block waiting for auth state to settle while the listener is still running. This causes:

1. The loading spinner hangs forever (second screenshot)
2. `isAdmin` never resolves to `true`, so the user sees the non-admin menu (first screenshot)
3. Logout fails because the auth state change never completes

## Solution: `src/contexts/AuthContext.tsx`

Decouple the admin check from `onAuthStateChange` by using a separate `useEffect` that reacts to `user` changes. The auth listener only sets `session`, `user`, and `loading`. The admin check runs independently.

```typescript
useEffect(() => {
  // Set up listener FIRST (no async operations inside)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setIsAdmin(false);
        setLoading(false);
      }
    }
  );

  // Then get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    if (!session?.user) {
      setLoading(false);
    }
  });

  return () => subscription.unsubscribe();
}, []);

// Separate effect: check admin role when user changes
useEffect(() => {
  if (!user) {
    setIsAdmin(false);
    return;
  }
  checkAdmin(user.id).then(() => setLoading(false));
}, [user]);
```

Key changes:
- No `await` inside `onAuthStateChange` — prevents deadlock
- Admin check runs in a separate `useEffect` triggered by `user` state changes
- `setLoading(false)` is called after admin check completes (for logged-in users) or immediately (for no user)
- `checkAdmin` already calls `setIsAdmin` internally, so no return value needed

## Files Modified
1. `src/contexts/AuthContext.tsx` — Split auth listener and admin check into separate effects

