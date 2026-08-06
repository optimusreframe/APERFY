# APERFY Incoming Orders with Telegram Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Capture every checkout as a persistent incoming order in Supabase, expose it to the buyer and admin panels, notify Telegram before opening WhatsApp, and preserve idempotency and order history.

**Architecture:** The checkout creates the order through a single authenticated/anonymous-safe Supabase Edge Function. The function persists the order and order items, sends a Telegram Bot API notification from server-side secrets, and returns a WhatsApp deep link. The client then opens WhatsApp and never treats WhatsApp delivery as the source of truth. Existing profile/admin order screens consume the persisted order records.

**Tech Stack:** React + TypeScript, Supabase Postgres/RLS, Supabase Edge Functions, Telegram Bot API, WhatsApp `wa.me` links, Vitest.

## Global Constraints

- Never expose `TELEGRAM_BOT_TOKEN` or Supabase service-role credentials in the browser.
- The persisted Supabase order is authoritative even if Telegram or WhatsApp fails.
- Duplicate clicks must not create duplicate orders.
- Product stock remains limited; creating an incoming order does not confirm payment.
- Preserve existing order history and product/order foreign-key integrity.
- Keep all UI consistent with APERFY macOS glass styling and Spanish/English translations where existing screens support both.

### Task 1: Audit existing checkout and order surfaces

**Files:**
- Inspect: `src/pages/Checkout.tsx`
- Inspect: `src/pages/Profile.tsx`
- Inspect: `src/pages/admin/AdminOrders.tsx`
- Inspect: `supabase/migrations/*orders*.sql`
- Inspect: `src/integrations/supabase/types.ts`

- [ ] Trace current checkout payload, auth state, order inserts, WhatsApp link generation, and existing buyer/admin order queries.
- [ ] Identify missing fields for customer name, phone, order status, idempotency key, and Telegram notification status.
- [ ] Verify existing RLS policies before changing schema.

### Task 2: Add tested order-capture contract

**Files:**
- Create: `src/lib/incomingOrder.ts`
- Test: `src/lib/incomingOrder.test.ts`

- [ ] Write failing tests for idempotency-key generation, order status transitions, WhatsApp message formatting, E.164 phone normalization, and Telegram payload formatting.
- [ ] Run the focused test and confirm failure.
- [ ] Implement pure, browser-safe helpers with explicit types.
- [ ] Run the focused test and confirm it passes.

### Task 3: Add Supabase schema and RLS

**Files:**
- Create: `supabase/migrations/20260806_incoming_orders.sql`
- Modify: `src/integrations/supabase/types.ts` if generated types are maintained locally.

- [ ] Add order lifecycle fields: `order_number`, `source`, `status`, `idempotency_key`, `customer_name`, `customer_phone`, `telegram_status`, `telegram_message_id`, and timestamps.
- [ ] Add a unique constraint on `(user_id, idempotency_key)` for authenticated buyers and a safe strategy for anonymous checkouts.
- [ ] Add RLS policies so buyers see only their orders and admins see all orders.
- [ ] Add indexes for `user_id`, `status`, `created_at`, and `idempotency_key`.
- [ ] Validate the migration and query access with Supabase tooling before committing.

### Task 4: Implement secure order capture and Telegram notification

**Files:**
- Create: `supabase/functions/create-incoming-order/index.ts`
- Create: `supabase/functions/_shared/telegram.ts`
- Test: `supabase/functions/create-incoming-order/index.test.ts` where the local test setup supports it.

- [ ] Validate product IDs, quantities, customer phone, and request idempotency server-side.
- [ ] Insert the order and order items transactionally or through a database RPC.
- [ ] Send Telegram using `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` server-side only.
- [ ] Include a direct `wa.me` button with a prefilled confirmation message.
- [ ] Store Telegram success/failure state and retry-safe metadata.
- [ ] Return the persisted order ID and WhatsApp URL even when notification delivery fails.

### Task 5: Integrate checkout and panels

**Files:**
- Modify: `src/pages/Checkout.tsx`
- Modify: `src/pages/Profile.tsx`
- Modify: `src/pages/admin/AdminOrders.tsx`
- Create or modify: shared order status/message components as required by the audit.

- [ ] Replace direct WhatsApp-only submission with order capture first.
- [ ] Prevent duplicate submissions while the request is pending.
- [ ] Open WhatsApp after the capture response and show a clear “pedido registrado” confirmation.
- [ ] Display incoming/pending orders in the buyer profile.
- [ ] Display source, customer phone, Telegram status, and WhatsApp contact action in admin.

### Task 6: Validate and publish

- [ ] Run focused tests, full tests, build, migration validation, and `git diff --check`.
- [ ] Run browser verification for checkout capture, duplicate-click prevention, admin visibility, profile visibility, and WhatsApp handoff without sending a real order.
- [ ] Review Supabase security and RLS output.
- [ ] Commit, push, create PR, merge, and report required Telegram/Supabase environment variables.
