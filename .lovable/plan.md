

# Variaciones + Checkout Seguro con WhatsApp y Pagos Online

## Resumen

8 cambios principales: 3 fixes de variaciones, rediseño del checkout con 2 caminos (WhatsApp + pago online), página admin de pagos, y capa de seguridad reforzada en todo el flujo de pagos.

---

## Base de Datos (3 migraciones)

**Migración 1 — `dimensions` y `material_id` en `product_variations`:**
```sql
ALTER TABLE public.product_variations ADD COLUMN dimensions text DEFAULT NULL;
ALTER TABLE public.product_variations ADD COLUMN material_id uuid DEFAULT NULL;
```

**Migración 2 — `payment_method` en `orders`:**
```sql
ALTER TABLE public.orders ADD COLUMN payment_method text DEFAULT NULL;
```

**Migración 3 — Seed payment settings en `admin_settings`:**
```sql
INSERT INTO public.admin_settings (setting_key, setting_value) VALUES
  ('payment_zelle', '{"active": true, "label": "Zelle", "info": "", "instructions": ""}'),
  ('payment_binance', '{"active": true, "label": "Binance Pay (USDT)", "info": "", "instructions": ""}'),
  ('payment_cashapp', '{"active": true, "label": "CashApp", "info": "", "instructions": ""}')
ON CONFLICT (setting_key) DO NOTHING;
```

---

## 1. Campo "Dimensiones" en variaciones

**AdminProducts.tsx**: Agregar input "Medidas (mm)" (ej: `25x25x10`) en cada variación.

**ProductDetail.tsx**: Mostrar dimensiones junto al peso en botones de variación.

## 2. Fix: Material no persiste

**AdminProducts.tsx**: Al cargar variaciones existentes (línea 508), leer `material_id` de la DB en vez de hardcodear `''`.

## 3. Fix: Campo precio con cero

**AdminProducts.tsx**: Agregar `onFocus={e => e.target.select()}` en todos los inputs numéricos (base_price, weight_grams, cost_per_kg) para que al hacer clic se seleccione el valor y se reemplace al escribir.

---

## 4. Checkout rediseñado con seguridad reforzada

**Flujo nuevo en `Checkout.tsx`:**

1. Formulario de envío (igual que ahora, con validación Zod)
2. Paso 2: Elegir método — "Continuar por WhatsApp" o "Pagar Online"
3. Ambas opciones crean la orden en DB antes de proceder

### Opción WhatsApp
- Crea orden con `payment_method: 'whatsapp'`, status `pending`
- Genera mensaje con: orden ID (8 chars), lista de productos con URL (`/3dmodels/{slug}`), variación, precio, total
- Abre `wa.me/16893324656?text=...`
- Admin puede gestionar la orden desde AdminOrders

### Opción Pago Online
- Muestra métodos activos (cargados desde `admin_settings`)
- Al seleccionar método, crea orden con `payment_method: 'zelle'|'binance'|'cashapp'`
- Muestra instrucciones de pago configuradas por el admin

### Medidas de Seguridad del Checkout

**Cliente:**
- Rate limiting: máximo 3 órdenes cada 5 minutos (ya existe, se mantiene)
- Validación Zod de todos los campos del formulario (ya existe)
- Sanitización de inputs con `stripHtml` (ya existe)
- Re-verificación de precios contra la DB antes de crear orden (ya existe)
- CSRF-like: token de sesión verificado via Supabase Auth (user.id en RLS)
- No exponer datos sensibles de pago en el cliente — las instrucciones se cargan bajo demanda solo después de crear la orden
- Sanitización del mensaje WhatsApp con `encodeURIComponent` para prevenir inyección de URLs
- Deshabilitar botón de submit durante procesamiento para prevenir doble-submit
- Validar que `payment_method` sea uno de los valores permitidos antes de enviar

**Servidor (RLS ya configurado):**
- `orders`: INSERT solo con `user_id = auth.uid()` (ya existe)
- `order_items`: INSERT solo si la orden pertenece al usuario (ya existe)
- `admin_settings`: SELECT público para leer métodos de pago, UPDATE solo admin (ya existe)
- Los datos de pago del admin (email Zelle, wallet Binance) solo se muestran al cliente DESPUÉS de crear la orden exitosamente, nunca antes del checkout

**Validación adicional:**
- Nuevo schema Zod `paymentMethodSchema` para validar que el método seleccionado sea uno de `['whatsapp', 'zelle', 'binance', 'cashapp']`
- Máximo de items por orden: 20 (previene abuso)
- Máximo de cantidad por item: 99
- Verificación de que todos los productos en el carrito existan y estén activos antes de crear la orden
- Logs de auditoría: la orden guarda `payment_method` para trazabilidad

---

## 5. Admin Payment Settings

**Nueva página `AdminPaymentSettings.tsx`:**
- 3 secciones fijas: Zelle, Binance Pay, CashApp
- Cada sección: Label, datos de pago (email/wallet/tag), instrucciones para el cliente, toggle activo/inactivo
- Guarda en `admin_settings` con keys `payment_zelle`, `payment_binance`, `payment_cashapp`
- Sanitización de inputs antes de guardar

**AdminSidebar.tsx**: Agregar link "Payments" con icono `CreditCard`.

**App.tsx**: Agregar ruta `admin/payments`.

---

## 6. Traducciones

Nuevas keys en `translations.ts`: dimensiones, medidas, continuar por WhatsApp, pagar online, instrucciones de pago, métodos de pago, etc.

---

## Archivos a modificar/crear

- 3 migraciones de base de datos
- `src/pages/admin/AdminProducts.tsx` — fix material, fix precio, campo dimensiones
- `src/pages/ProductDetail.tsx` — mostrar dimensiones
- `src/pages/Checkout.tsx` — rediseño completo con 2 caminos + seguridad
- `src/pages/admin/AdminPaymentSettings.tsx` — nueva página
- `src/pages/admin/AdminSidebar.tsx` — link Payments
- `src/App.tsx` — ruta admin/payments
- `src/lib/validation.ts` — schema paymentMethod
- `src/i18n/translations.ts` — nuevas traducciones

