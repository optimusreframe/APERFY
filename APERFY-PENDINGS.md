# APERFY — Pendientes de producción

Este archivo concentra las tareas de infraestructura y credenciales que quedan para activar APERFY en producción.

## Supabase

- [ ] Confirmar el proyecto Supabase de producción y su URL.
- [ ] Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en Vercel.
- [ ] Aplicar y verificar todas las migraciones en producción.
- [ ] Revisar RLS para productos, órdenes, perfiles, roles, solicitudes y configuraciones.
- [ ] Confirmar que `andresperniaj@gmail.com` tenga el rol `admin`.
- [ ] Crear/verificar los buckets `product-images` y `email-assets`.
- [ ] Configurar las URLs de redirección de Supabase Auth para `https://aperfy.kpwr.dev`.

## AI y Edge Functions

- [ ] Configurar `LOVABLE_API_KEY` o `AI_PROVIDER_API_KEY`.
- [ ] Configurar `AI_VISION_MODEL`.
- [ ] Configurar `FIRECRAWL_API_KEY` para referencias de mercado.
- [ ] Configurar `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_URL` en las Edge Functions.
- [ ] Desplegar y probar `ai-product-import`.
- [ ] Desplegar y probar `ai-product-from-url`.
- [ ] Desplegar y probar `ai-product-from-photo`.
- [ ] Validar generación de imágenes, fondos y precio sugerido.

## Vercel y dominio

- [ ] Conectar el repositorio APERFY a Vercel.
- [ ] Configurar las variables de `.env.example` en Preview y Production.
- [ ] Añadir `aperfy.kpwr.dev` y verificar DNS/HTTPS.
- [ ] Configurar `VITE_SITE_URL=https://aperfy.kpwr.dev`.

## Comunicación y operación

- [ ] Confirmar `VITE_WHATSAPP_NUMBER` y probar el flujo completo de orden.
- [ ] Configurar `TELEGRAM_BOT_TOKEN` y `TELEGRAM_ADMIN_CHAT_ID` si se usará Telegram.
- [ ] Configurar `TELEGRAM_CHAT_ID` y `WHATSAPP_BUSINESS_NUMBER` como secretos de la Edge Function `notify-telegram-order`.
- [ ] Desplegar `notify-telegram-order` y probar que el pedido llegue a Telegram antes de abrir WhatsApp.
- [ ] Verificar estados `pending`, `sending`, `sent` y `failed` en el panel de admin.
- [ ] Confirmar `ORDER_RESERVATION_MINUTES`.
- [ ] Configurar proveedor de email transaccional y verificar plantillas.

## QA de lanzamiento

- [ ] Probar registro, login, recuperación de contraseña y rol admin.
- [ ] Probar creación de producto por URL y por foto.
- [ ] Probar variantes, stock limitado, carrito, checkout y WhatsApp.
- [ ] Validar APERFY en móvil, Safari, Edge y desktop.
- [ ] Revisar accesibilidad, `prefers-reduced-motion` y rendimiento.
