# Plan — Admin & Product Upgrades

## 1. Precios manuales (producto + variaciones)

Hoy `price_modifier` se sobreescribe siempre con `(peso/1000) * costo_material`. Vamos a permitir override manual sin perder el cálculo como sugerencia.

- Migración DB: agregar a `product_variations`:
  - `price_override numeric NULL` (precio manual; si está, se usa este)
  - `use_manual_price boolean DEFAULT false`
  - El precio efectivo = `use_manual_price ? price_override : calculated`.
- En el form de variación (AdminProducts wizard):
  - Toggle "Precio manual" junto a "Precio Calc.".
  - Si OFF: muestra precio calculado (como hoy).
  - Si ON: input editable + chip "Sugerido: $X.XX" del cálculo automático.
- `base_price` del producto ya es manual; solo añadir un chip "Sugerido por IA: $X" cuando venga del flujo AI, sin forzar.
- Front (ProductDetail / Cart / Checkout): leer el precio efectivo desde la variación. Si no hay override, se mantiene el comportamiento actual.

## 2. Renombrar "Configurar" (estilo Amazon)

Amazon usa el **nombre del atributo** como título (ej: "Size:", "Color:", "Style:") con el valor seleccionado al lado.

- Reemplazar el bloque `CONFIGURAR / TAMAÑO / SELECCIONADO` en `ProductDetail.tsx` por encabezados tipo Amazon:
  - `Tamaño: 20 cm` / `Size: 20 cm` (label = `variation.type`, valor = opción activa).
  - Si no hay variaciones: `Edición: Estándar`.
- Aplica el mismo patrón si hay más de un tipo (size + color → dos filas).

## 3. AI Image Studio (rework)

Problemas actuales: la IA mete imágenes ajenas/duplicadas; al cambiar de imagen se pierden las ya editadas; no se pueden añadir fotos propias como adicionales.

Nuevo flujo en el paso "Media" del wizard:

- **Imagen primaria única**: el edge function genera **una sola** versión limpia del producto (no extrae galería del sitio externo, solo usa la URL como referencia visual).
- **"Generar más ángulos"**: botón con selector (2 / 4 / 6) que llama al edge function con prompts tipo `front / 3-4 view / side / top / detail / lifestyle`, manteniendo identidad (color/textura/diseño) — solo cambia ángulo/iluminación/fondo.
- **Galería persistente**: estado `productImages: Array<{ id, url, source: 'ai' | 'upload', isPrimary, angle? }>` guardado en memoria del wizard + en `localStorage` por draft id para sobrevivir refrescos.
- **Subir desde galería**: drag-and-drop / file picker → se añaden como `source: 'upload'`, nunca reemplazan las AI.
- **Bug fix**: seleccionar una miniatura solo cambia `primaryImageId`; no re-dispara generación ni borra ediciones. Las ediciones AI se guardan inmutables por imagen.
- Acciones por imagen: marcar como primaria, regenerar (solo esa), editar con AI (mantener identidad), eliminar.

## 4. Wizard "Apple + Palantir" + preview en vivo + AI por variación

- **Panel derecho interactivo** (`lg:col-span-1` del wizard): convertirlo en **Live Preview Card** que refleja en tiempo real:
  - Imagen primaria seleccionada (con fade entre cambios).
  - Nombre, categoría, precio efectivo (incluye override).
  - Variación seleccionada con su peso/dimensiones.
  - Tarjeta de specs estilo Palantir (mono, `tabular-nums`, hairlines).
  - Mini-progreso del wizard (Media → Identidad → Precio → Variaciones → Publicar) con paso activo destacado.
- **Imagen opcional por variación**:
  - Migración: `product_variations.image_url text NULL`.
  - En cada card de variación: slot "Imagen de variación" con dos botones — "Subir" y "Generar con IA" (prompt = imagen primaria + descripción de la variación, manteniendo identidad).
  - En `ProductDetail`: al cambiar de variación, si tiene `image_url`, el hero hace crossfade a esa imagen (vuelve a la primaria si la variación no tiene).
- **Estética general del wizard**: command bar sticky con breadcrumbs y `DRAFT-XXXX`, glass cards (`bg-card/40 backdrop-blur-xl`), separadores hairline, tipografía mono para labels técnicos, micro-animaciones con framer-motion en transiciones de paso.

## 5. Admin panel — refresco Apple + Palantir

Mantener paleta (negro + oro). Tocar `AdminLayout`, `AdminSidebar`, `AdminDashboard`, headers de cada página admin.

- **Sidebar**: glass, iconos finos, secciones agrupadas (Catálogo / Ventas / Sistema), indicador activo de barra vertical dorada, badge mono con conteos (ej. pedidos pendientes).
- **Top bar**: command bar con breadcrumbs + buscador global (⌘K) + indicador de entorno (`LIVE`/`TEST`).
- **Dashboard**: bento grid de KPIs (revenue, pedidos hoy, conversión, stock bajo), sparklines, tabla de actividad reciente estilo Palantir (mono, hairlines, hover row highlight).
- **Tablas (Products/Orders/etc.)**: density toggle, columnas mono para IDs/SKUs, status pills consistentes, row hover con acento dorado sutil.

## 6. Ideas adicionales (no se implementan ahora, listadas para que elijas)

Venta / conversión:
- Checkout express con resumen sticky y "buy again" desde Profile.
- Upsell de variación mayor en cart ("+$X y obtén 20cm").
- Wishlist → email automático cuando baja de stock o vuelve.
- Reviews con foto verificada del comprador en homepage trending.
- Códigos de descuento + countdown banner.

Admin:
- Vista Kanban de pedidos (pendiente → impresión → enviado → entregado) con drag.
- Calculadora de margen en línea (precio − costo material × peso − envío).
- Bulk AI: regenerar imágenes faltantes de varios productos.
- Logs filtrables por tipo + export CSV.
- Notificaciones in-app (campana) para pedidos nuevos y requests.

Producto / marketing:
- 3D viewer (model-viewer) opcional por producto.
- Comparador de variaciones lado a lado.
- Generador de OG images por producto con la imagen primaria.
- Programa de referidos.

## Detalles técnicos

- Migraciones SQL en una sola call (variaciones: `price_override`, `use_manual_price`, `image_url`).
- Edge function `ai-product-import`: nuevo modo `mode: 'angles'` que recibe imagen base + lista de ángulos y devuelve N imágenes manteniendo identidad. Eliminar el scraping masivo de imágenes del sitio externo (solo usa 1 como referencia).
- Storage: bucket `product-images` (ya existente o nuevo) para guardar uploads y AI persistidos.
- Tipos: extender `ProductVariation` y `Product` interfaces en `AdminProducts.tsx` y `ProductDetail.tsx`.
- Sin cambios en lógica de carrito/orden más allá de leer `price_override` cuando aplique.

¿Procedo así, o querés que ajuste algo (por ejemplo: hacer items 1–4 ahora y dejar el refresh del admin (#5) para otra ronda)?
