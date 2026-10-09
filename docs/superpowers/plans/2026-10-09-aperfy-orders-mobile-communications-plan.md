# APERFY orders, mobile app shell, and branded communications

## Objective

Improve the customer and operator experience without breaking the current WhatsApp checkout, order creation, Telegram notification, inventory, or admin authorization flows.

## Required Outcomes

1. Replace the plain WhatsApp order text with a compact, bilingual-friendly order receipt/comanda containing APERFY identity, order code, customer/contact, shipping, line items, totals, payment state, and a clear confirmation question.
2. Make the store and admin surfaces feel app-like on phone and iPad: eliminate horizontal overflow, respect safe areas, preserve internal scrolling, provide stable touch targets, and keep desktop behavior intact.
3. Make Kanban order status changes genuinely interactive on touch and pointer devices, with explicit drop affordances, mutation feedback, and the same status automations used by the existing status selector.
4. Add payment verification workflow with proof upload associated to an order, payment received state, auditability, and no secret exposure. Preserve WhatsApp as the current checkout method.
5. Add safe order/request archiving and deletion UX with confirmation, role enforcement, and recovery-oriented archived views. No real production records may be deleted during this task.
6. Add a finance ledger/admin view for sales-related movements, starting from order/payment data and remaining extensible for future Stripe, PayPal, USDT, and Zelle flows.
7. Deliver branded transactional email templates with a verified APERFY logo asset URL and premium responsive HTML fallback/custom-template behavior.

## Explicit Constraints

- APERFY remains fully independent from 3dtoprint.
- Do not import, delete, or mutate product data as part of this task.
- Do not send real customer emails, WhatsApp messages, or Telegram messages during tests.
- Do not store secrets in the repository or browser client.
- Do not use destructive migrations or delete real production records.
- Existing checkout and order data must remain compatible.
- Any migration must be additive, RLS-protected, and verified in Supabase.

## Existing Decisions and Reuse

- Reuse the existing `AdminOrders` list/kanban, status mutation, `buildIncomingOrderMessages`, `notification_templates`, `send-transactional-email`, `notify-telegram-order`, `MacAppShell`, `BottomTabBar`, and APERFY dark graphite/green token system.
- Reuse the existing admin role helper and storage patterns; do not create a second authorization model.
- Use the official APERFY logo asset already present in `public/` or the verified public Supabase asset, after checking its production URL.

## Out of Scope

- Online payment gateway activation.
- Historical data recovery from 3dtoprint.
- Bulk product edits or inventory imports.
- Changing business rules for stock reservation.

## Acceptance Criteria

- WhatsApp message reads as a receipt/comanda and contains every order/customer field without malformed international links.
- Store/admin pages have no horizontal scroll at 375px, 768px, 820px, and 1024px viewport widths; bottom navigation and fixed actions respect safe areas.
- Kanban drag/drop and the status selector update the same order path, show pending/error/success states, and are keyboard/touch reachable.
- Payment proof can be uploaded only by an admin, is linked to the order, and payment receipt can be recorded with timestamp/user/audit record.
- Orders and product requests can be archived with confirmation and are recoverable from an archive view; permanent deletion is guarded and not used in production tests.
- Finance view derives its initial ledger from orders/payment events and does not expose unauthorized customer data.
- Branded email renders with APERFY logo, dark/green identity, responsive layout, plain-text fallback, and safe template overrides.
- Tests, build, lint of touched files, migration verification, and production smoke all pass or are explicitly reported with limitations.

## Independent Workstreams

- Read-only discovery and architecture review: parallel.
- WhatsApp/email branding: separate from mobile layout and admin operations, but production publish waits for all workstreams.
- Mobile app shell and admin responsive layout: separate files from communications where possible.
- Orders/payment/archive/finance: one serialized data-domain workstream because it shares migrations, generated types, and admin operations.

## Delegation Map

- `ox-explorer`: repository/source-of-truth and schema discovery; no edits.
- `ox-architect`: root-cause, migration, RLS, and integration design review; no edits.
- `ox-builder`: one focused implementation workstream at a time from this plan.
- `ox-validator`: static, targeted, workflow, and regression validation.
- `ox-verifier`: fresh-context verification of the final claims.
- Orchestrator: contract, plan, migration authorization boundary, production publish, and final synthesis.

## Validation Strategy

- Red tests first for new pure helpers and state transitions.
- Full unit/component suite, touched-file lint, production build.
- Browser checks at phone/iPad/desktop widths, including horizontal overflow and touch targets.
- Supabase schema/RLS/data-count verification before and after migrations.
- No production messaging side effects; use render/URL assertions and test fixtures.

## Rollback / Recovery

- Frontend rollback via prior Vercel deployment.
- Additive migrations preserve existing rows and can be disabled through admin UI flags.
- Archive instead of delete is the default; no destructive production operation is required.

## Architectural Integrity Check (planned)

- Extend existing order/notification patterns before introducing new abstractions.
- Finance ledger should be an additive normalized event table or view only if current schema cannot safely represent it; verify existing tables first.
- Payment proof should use a private/admin-controlled storage bucket and RLS, not public URLs by default.

## Task 1 — communications

Implement and test the customer-facing WhatsApp receipt/comanda and branded transactional email path.

- Extend `buildIncomingOrderMessages` compatibly with payment method/state and complete order fields.
- Keep the WhatsApp deep link deterministic and preserve the current order creation flow.
- Add pure tests for line items, totals, shipping, language, and international phone normalization.
- Make the order-confirmation HTML and text fallback visibly APERFY-branded, responsive, and logo-safe without remote CSS or secrets.
- Do not change admin order UI or production data in this task.

## Task 2 — operations and payments

Add the additive data model and admin workflows for order operations.

- Add payment state/events, proof metadata, archive metadata, and a finance-ready ledger source with RLS and admin-only writes.
- Use a private proof bucket with signed access; do not expose proof URLs publicly.
- Make list status controls and Kanban changes use one mutation path, with pointer/touch/keyboard-friendly affordances and visible feedback.
- Add reversible order and product-request archive/recovery UX; do not delete production rows.
- Add payment proof upload and payment-received audit behavior without enabling online gateways.

## Task 3 — finance

Expose a responsive admin finance view derived from orders and payment events.

- Show sales, received, pending, and event history using the existing currency and order records.
- Keep the model extensible for Stripe, PayPal, USDT, and Zelle without activating those gateways.
- Avoid duplicate mutable totals where a derived query or event record is sufficient.
- Restrict customer-sensitive details to authorized admin views.

## Task 4 — mobile and iPad experience

Make store and admin surfaces app-like at phone and tablet breakpoints.

- Remove horizontal overflow and clipped table content at 375px, 768px, 820px, and 1024px.
- Preserve safe-area insets, bottom navigation, fixed actions, internal scrolling, and stable 44px touch targets.
- Improve Admin Orders list/Kanban presentation without changing desktop information architecture.
- Keep the APERFY graphite/green/gold visual system and use existing icon components.

## Task 5 — validation and release

Validate the complete change set before publish.

- Run unit/component tests, touched-file lint, production build, migration verification, and Supabase advisors.
- Use browser checks at phone/iPad/desktop widths for checkout, order creation path, admin list/Kanban, archive/recovery, proof UI, and finance view.
- Assert WhatsApp URLs and rendered messages without sending real messages.
- Confirm no APERFY code/config references 3dtoprint and no product rows were mutated.
- Publish only after fresh-context verification and record residual limitations/rollback points.
