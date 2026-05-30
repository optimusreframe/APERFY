# Checkout Apple-style + Floating Cart + Visual Admin Product Creator

Tres mejoras independientes, todas frontend (sin cambios de schema ni de lógica de negocio).

---

## 1. Checkout estilo Apple

Rediseño visual y de flujo de `src/pages/Checkout.tsx` inspirado en `apple.com/shop/bag` → checkout.

**Cambios de UX:**
- Layout de **dos columnas** en desktop (form a la izquierda, resumen sticky a la derecha con miniaturas de productos, envío, total). En móvil, resumen colapsable arriba.
- Tipografía SF-like (mantener fuentes actuales, pero pesos y tracking más Apple: títulos grandes `text-4xl font-semibold tracking-tight`, mucho whitespace, líneas divisorias finas `border-border/40`).
- **Step indicator minimalista**: barra de progreso fina arriba con 3 puntos numerados conectados, no las pills doradas actuales.
- **Inputs flotantes** (floating label) en lugar de label-sobre-input — patrón Apple Pay sheet. Bordes redondeados `rounded-xl`, foco con anillo dorado sutil.
- Cada sección como una **"card" blanca/oscura** apilada (Contact → Shipping Address → Shipping Method → Payment), con botón "Continue" grande al final de cada sección que colapsa la anterior y muestra check ✓ con datos resumidos editables.
- Botones de método de pago como **tarjetas seleccionables** grandes (radio cards) con iconos.
- Pantalla de confirmación con animación de check grande, número de pedido tipo "Order #XXXX", y CTA "View order" / "Continue shopping".

**Sin cambios** en: validación, RLS, envío de emails, integración WhatsApp/pagos, cálculo de shipping. Solo presentación y orquestación de pasos.

---

## 2. Carrito flotante al agregar producto

Cuando el usuario hace "Add to cart" (desde `ProductDetail.tsx` o cualquier lugar):

- Mostrar un **mini-toast/sheet flotante** en la esquina inferior derecha (desktop) o bottom sheet (móvil) durante ~5 segundos.
- Contenido: miniatura del producto añadido, nombre, "Added to cart", y dos botones:
  - **"Continue shopping"** (secundario, cierra el toast)
  - **"View cart"** (primario dorado, navega a `/cart`)
- Animación slide-in desde abajo/derecha con framer-motion, auto-dismiss con barra de progreso fina.
- Implementación: nuevo componente `src/components/CartAddedToast.tsx` + estado en `CartContext` (`lastAddedItem` + timestamp) o un evento simple. Renderizado global en `App.tsx` para que aparezca desde cualquier página.

---

## 3. Admin: creación de productos visual (Apple × Palantir)

Refactor del formulario de creación/edición en `src/pages/admin/AdminProducts.tsx` (sin tocar la lógica de guardado, mutaciones, ni schema). Solo la UI del Dialog/modal.

**Nuevo flujo guiado por pasos (wizard), full-screen sheet:**

1. **Media** — Drag & drop grande tipo Apple: zona central con preview en grid, reordenable, primera imagen marcada como "Cover". Botón "Generate with AI" prominente.
2. **Identity** — Nombre EN/ES lado a lado con toggle de idioma estilo segmented control, slug auto-generado con campo editable bajo el nombre, descripción en editor amplio.
3. **Pricing & Category** — Precio base con input grande tipo Apple Pay (símbolo $ flotante), selector de categoría como pills/chips visuales con icono.
4. **Variations & Materials** — Tabla densa estilo Palantir: filas con inputs inline, columnas para tamaño/peso/dimensiones/material/modificador de precio. Acentos monoespaciados para números, líneas de grid finas, hover highlight.
5. **Review & Publish** — Preview del ProductCard real + toggles `is_active` / `is_featured` como switches grandes con descripción.

**Estética:**
- Sidebar izquierda con los 5 pasos (numerados, check verde al completar, paso activo en dorado).
- Header sticky con nombre del producto en vivo + botones "Cancel" / "Save draft" / "Publish".
- Transiciones suaves entre pasos con framer-motion.
- Densidad Palantir en la tabla de variaciones: fuente más pequeña, monospace para números, sin padding excesivo.

**Lógica preservada:** todas las mutaciones, validaciones Zod, subida de media, integración AI, bulk import — sin cambios.

---

## 4. Verificación del sistema

Después de los cambios:
- Recorrer manualmente: añadir producto al carrito → ver toast → ir a checkout → completar los 4 sub-pasos → confirmar email enviado en logs.
- Verificar que el admin puede crear un producto nuevo con el wizard, subir media, añadir 2 variaciones, y que aparece correctamente en el catálogo.
- Revisar console + network para errores.
- Sin cambios de DB ni edge functions, así que no hay migraciones que correr.

---

## Archivos

**Modificar:**
- `src/pages/Checkout.tsx` — rediseño visual completo, misma lógica.
- `src/pages/admin/AdminProducts.tsx` — wizard UI para el dialog de crear/editar.
- `src/contexts/CartContext.tsx` — exponer `lastAdded` para el toast.
- `src/App.tsx` — montar `<CartAddedToast />` global.

**Crear:**
- `src/components/CartAddedToast.tsx`
- `src/components/checkout/CheckoutSection.tsx` (card colapsable reutilizable)
- `src/components/checkout/OrderSummary.tsx` (panel sticky derecha)
- `src/components/admin/ProductWizard.tsx` (contenedor del wizard + sub-componentes por paso si conviene)

Sin cambios en backend, schema, RLS, edge functions, ni emails.
