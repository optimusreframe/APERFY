

# Replace Login/Signup with Single Premium 3D Contact Button

## Change

Replace the two separate "Log In" and "Sign Up" buttons (lines 204-217) with a single premium button using a `UserRound` or `UserPlus` icon, styled with the gold gradient, 3D depth shadows, and glow effects matching the navbar's premium aesthetic.

### Edit: `src/components/Navbar.tsx`
- Remove the `<div>` containing both Login and Signup buttons
- Replace with a single `<Link to="/auth">` containing a styled icon button:
  - Gold gradient background with 3D layered box-shadows
  - `UserRound` icon (from lucide-react) — clean "contact/person" look
  - Subtle glow pulse animation behind the button
  - Rounded pill shape, slightly larger than other action icons
  - Hover: scale up slightly + increased glow
- Also update the mobile menu: replace the two mobile auth buttons with a single styled button

### Visual Treatment
- Background: `bg-gradient-gold` with `shadow-gold`
- 3D depth: multi-layer box-shadow (dark below, gold glow)
- Hover: `scale(1.05)` + brighter glow
- Icon: `UserRound` in `text-primary-foreground` (dark on gold)
- Size: `w-10 h-10` rounded-full or `px-4 py-2` rounded-xl pill

No new files. Single file edit.

