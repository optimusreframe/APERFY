

# Transactional Emails for All Order & Business Events

## Overview

Set up the full transactional email infrastructure and create templates for every key business event in the app. Each template will match the existing dark premium 3DtoPrint branding (dark background `#0A0A0F`, gold `#D4A017`, white text). All emails in English.

## Email Templates to Create

| # | Template Name | Trigger | Where to wire |
|---|--------------|---------|---------------|
| 1 | `order-confirmation` | Customer places an order (WhatsApp or online payment) | `Checkout.tsx` — after `createOrder()` succeeds |
| 2 | `order-confirmed` | Admin changes status to "confirmed" | `AdminOrders.tsx` — `updateStatus` mutation |
| 3 | `order-printing` | Admin changes status to "printing" | `AdminOrders.tsx` — `updateStatus` mutation |
| 4 | `order-shipped` | Admin changes status to "shipped" | `AdminOrders.tsx` — `updateStatus` mutation |
| 5 | `order-delivered` | Admin changes status to "delivered" | `AdminOrders.tsx` — `updateStatus` mutation |
| 6 | `order-cancelled` | Admin changes status to "cancelled" | `AdminOrders.tsx` — `updateStatus` mutation |
| 7 | `payment-received` | Admin confirms payment (new button on order row) | `AdminOrders.tsx` — new "Confirm Payment" action |
| 8 | `model-request-received` | User submits a model request form | `RequestModel.tsx` — after insert succeeds |

## Implementation Steps

### Step 1: Scaffold transactional email infrastructure
- Use the built-in tooling to create the `send-transactional-email` edge function, suppression handling, and unsubscribe support.

### Step 2: Create 8 email templates
All in `supabase/functions/_shared/transactional-email-templates/`:
- Each template uses the same dark premium style as the auth emails (dark bg, gold accents, white text, logo)
- Dynamic props for order ID, customer name, total, items list, shipping info, etc.
- Register all in `registry.ts`

### Step 3: Wire up triggers in frontend code

**`Checkout.tsx`** — After `createOrder()` returns an order ID:
```
supabase.functions.invoke('send-transactional-email', {
  body: { templateName: 'order-confirmation', recipientEmail: form.email, idempotencyKey: `order-confirm-${orderId}`, templateData: { ... } }
})
```

**`AdminOrders.tsx`** — In `updateStatus` mutation `onSuccess`:
- Fetch the order's shipping_address email
- Send the appropriate status template based on the new status
- Add a "Confirm Payment" button that sends `payment-received` email

**`RequestModel.tsx`** — After successful insert:
- Send `model-request-received` to the requester's email

### Step 4: Create unsubscribe page
- Add `/email-unsubscribe` route with branded UI matching the site

### Step 5: Deploy edge functions
- Deploy `send-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`

## Files to create/modify

**Create:**
- `supabase/functions/_shared/transactional-email-templates/order-confirmation.tsx`
- `supabase/functions/_shared/transactional-email-templates/order-confirmed.tsx`
- `supabase/functions/_shared/transactional-email-templates/order-printing.tsx`
- `supabase/functions/_shared/transactional-email-templates/order-shipped.tsx`
- `supabase/functions/_shared/transactional-email-templates/order-delivered.tsx`
- `supabase/functions/_shared/transactional-email-templates/order-cancelled.tsx`
- `supabase/functions/_shared/transactional-email-templates/payment-received.tsx`
- `supabase/functions/_shared/transactional-email-templates/model-request-received.tsx`
- `supabase/functions/_shared/transactional-email-templates/registry.ts`
- `src/pages/EmailUnsubscribe.tsx`

**Modify:**
- `src/pages/Checkout.tsx` — add email send after order creation
- `src/pages/admin/AdminOrders.tsx` — add email send on status change + payment confirmation
- `src/pages/RequestModel.tsx` — add email send after model request
- `src/App.tsx` — add `/email-unsubscribe` route

## Final Deliverable

A complete list of all emails in the system, their triggers, and connection status.

