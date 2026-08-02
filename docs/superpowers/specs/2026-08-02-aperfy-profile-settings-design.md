# APERFY profile settings redesign

## Goal

Make `/profile` feel like an iOS 27 profile surface inside the APERFY macOS app shell, while preserving the existing account, orders, favorites, referrals, avatar upload, and sign-out behavior.

## Design

- Keep the shared APERFY macOS title bar and fixed inner scrolling shell.
- Replace the dashboard hero with a compact identity card: avatar, account name/email, active state, and a subtle APERFY accent.
- Use a System Settings-like navigation model: grouped sidebar on desktop and horizontally scrollable compact tab row on mobile.
- Replace colored dashboard cards with neutral graphite/glass statistic widgets using green only for active state and positive emphasis.
- Present quick actions as macOS/iOS settings rows with icon, label, supporting text, and chevron affordance.
- Keep the minimal copyright footer outside the main settings surface.
- Keep all existing tab data flows and query behavior unchanged.

## Validation

- Existing test suite remains green.
- Production build remains green.
- Browser smoke checks confirm one APERFY header, fixed shell scrolling, readable contrast, and a settings-like profile layout at desktop and mobile widths.
