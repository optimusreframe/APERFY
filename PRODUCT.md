# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing Vite + React + TypeScript + Supabase application. Deployment target: Vercel is planned. Domain target: `aperfy.kpwr.dev`.

## Users

Primary users are shoppers in the US who want useful, interesting products at attractive prices without browsing a generic marketplace. They are comparing a curated find, deciding whether the value is credible, and placing an order that is confirmed conversationally.

The operator is Andrés Pernia, who sources real products through legitimate opportunities, verifies reference value, curates inventory, and manages each order from the admin panel.

## Product Purpose

APERFY is a curated ecommerce store for real products with variable, limited inventory. It helps a shopper discover a worthwhile product, understand why the price is attractive, place an order, and continue the confirmation through WhatsApp. Success means the shopper trusts the selection and the operator can manage the order lifecycle from one source of truth.

## Positioning

“A Perfect Find, For You.” APERFY is not a generic discount marketplace: Andrés finds a legitimate opportunity, APERFY verifies the value, and the customer buys better. Products are not promised as the lowest price online without evidence.

## Operating Context

The storefront supports browsing, search, product detail, cart, account, checkout, order history and admin inventory/order operations. The public storefront does not process online payments. It creates an order first, reserves inventory when the backend is connected, notifies the operator through Telegram, and opens WhatsApp at `+1 470-846-9271` with a personalized order message.

## Capabilities and Constraints

- Required locales: English and Spanish; currency: USD.
- Required theme modes: system, light and dark, persisted without a theme flash.
- Price claims require a valid reference price, source and verification timestamp.
- Inventory is real, variable and limited; no false urgency.
- No 3D-printing catalog, STL files, print services, filament/material claims or 3D-specific customer workflow in the APERFY public experience.
- Telegram credentials remain server-side; no secrets in client code.
- Supabase/Vercel production resources must be independent from the source project.
- Open decisions: final catalog taxonomy, shipping policy, Telegram Edge Function contract and the authoritative APERFY Supabase project.

## Brand Commitments

- Name: APERFY. Technical slug: `aperfy`.
- Official asset: `public/brand/aperfy-logo.png`.
- Green identity derived from the supplied logo, with light/dark support.
- Voice: precise, confident, modern, helpful; never spammy, fake-urgent or discount-bin.
- Approved phrase: “A Perfect Find, For You.”

## Evidence on Hand

- Official logo supplied by the user at `C:\Users\LRS\Downloads\APERFY_LOGO-green.png` and copied to `public/brand/aperfy-logo.png`.
- Existing React/Supabase source repository and demo product records are available in this workspace.
- No verified testimonials, market benchmark dataset, production Supabase project, Telegram bot credentials or final product photography have been supplied. The interface must not fabricate these.

## Product Principles

1. Curate with intent: every visible product earns its place.
2. Explain value: show evidence, not invented savings.
3. Keep inventory honest: limited means real, not theatrical.
4. Make ordering human: create the order first, then confirm conversationally.
5. Keep the interface precise: technology should clarify trust, not obscure shopping.

## Accessibility & Inclusion

The web storefront must meet WCAG AA targets for contrast, keyboard focus, semantic landmarks, form labels and reduced motion. Motion must preserve comprehension and task completion when `prefers-reduced-motion` is enabled.
