

# Rediseño Premium: 3DtoPrint Marketplace

## Visión

Transformar la landing page actual en un marketplace de modelos 3D de nivel profesional, inspirado en MakerWorld/Thingiverse pero con la estética dark+gold premium que ya tienes. La página principal (`/`) deja de ser una landing informativa y se convierte en un **feed de descubrimiento de productos** con navegación por categorías.

## Cambios Principales

### 1. Nueva Página Principal (`/`) — Feed-First Design

Reemplazar las 6 secciones de landing (Hero, Featured, HowItWorks, Materials, Stats, RequestCTA) por un layout de marketplace:

```text
┌─────────────────────────────────────────────────┐
│  Navbar (se mantiene)                           │
├─────────────────────────────────────────────────┤
│  Hero Banner Compacto (carousel de banners)     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Banner1 │ │ Banner2 │ │ Banner3 │          │
│  └─────────┘ └─────────┘ └─────────┘          │
├─────────────────────────────────────────────────┤
│  Category Pills (scroll horizontal)             │
│  [All] [Toys] [Home] [Art] [Tools] [Cosplay]   │
├─────────────────────────────────────────────────┤
│  Trending Now — Carrusel horizontal             │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
├─────────────────────────────────────────────────┤
│  Grid Principal de Productos                    │
│  2 cols mobile / 3-4 cols desktop               │
│  Con infinite scroll o load more                │
├─────────────────────────────────────────────────┤
│  Footer compacto                                │
└─────────────────────────────────────────────────┘
```

- **Hero Banner**: Sección compacta (~200px height) con carousel automático mostrando banners promocionales, nuevos lanzamientos o categorías destacadas. No más impresora 3D animada gigante.
- **Category Pills**: Barra horizontal scrollable con las categorías reales de la DB, filtrado instantáneo sin cambiar de página.
- **Trending Section**: Carrusel horizontal tipo MakerWorld con los productos más populares (por likes).
- **Grid de Productos**: Todos los productos activos con el diseño de tarjeta actual (4:3, likes, favs). Incluye sort y búsqueda integrada en la barra superior.

### 2. Tarjetas de Producto Mejoradas

Mantener el diseño actual pero agregar:
- Badge de "New" para productos de los últimos 7 días
- Badge de "Trending" para los más likeados
- Soporte para GIF/video preview on hover (si el producto tiene)
- Animación sutil de entrada escalonada

### 3. Navbar Actualizado

- Agregar barra de búsqueda global prominente en el centro (estilo MakerWorld)
- Los nav links se simplifican: Home, Explore (actual /3dmodels), Request
- Search siempre visible en desktop, expandible en mobile

### 4. Mejoras en Store (`/3dmodels`)

- Renombrar conceptualmente a "Explore" 
- Sidebar de filtros con diseño collapsible mejorado
- Contadores de resultados visibles
- Vista de grid switchable (2/3/4 columnas)

### 5. Product Detail — Nivel Pro

- Galería de imágenes con zoom on hover
- Layout más espacioso y premium
- Sección de especificaciones técnicas con iconos
- "You may also like" mejorado con carrusel

### 6. Footer Compacto

Reducir el footer a una versión más limpia y minimalista.

## Archivos a Modificar/Crear

1. **`src/pages/Index.tsx`** — Reescribir como marketplace feed
2. **`src/components/landing/HeroBanner.tsx`** — Nuevo: carousel de banners compacto
3. **`src/components/landing/CategoryPills.tsx`** — Nuevo: barra de categorías
4. **`src/components/landing/TrendingSection.tsx`** — Nuevo: carrusel horizontal trending
5. **`src/components/ProductCard.tsx`** — Nuevo: componente compartido de tarjeta de producto
6. **`src/components/Navbar.tsx`** — Agregar barra de búsqueda global
7. **`src/pages/Store.tsx`** — Mejoras en filtros y grid
8. **`src/pages/ProductDetail.tsx`** — Galería con zoom, layout mejorado
9. **`src/components/Footer.tsx`** — Versión compacta
10. **`src/index.css`** — Nuevas utilidades CSS si necesario

Se eliminan los archivos de landing que ya no se usan:
- `HeroSection.tsx`, `HowItWorksSection.tsx`, `MaterialsSection.tsx`, `StatsSection.tsx`, `RequestCTASection.tsx`
- `FeaturedSection.tsx` se reemplaza por `TrendingSection.tsx`

## Scope de Implementación

Se implementará en fases dentro de un solo ciclo:
1. Crear `ProductCard` compartido + `CategoryPills` + `TrendingSection` + `HeroBanner`
2. Reescribir `Index.tsx` con el nuevo layout
3. Actualizar `Navbar` con búsqueda global
4. Mejorar `ProductDetail` con zoom gallery
5. Limpiar archivos obsoletos

No se tocan: base de datos, auth, admin, cart, checkout, orders, i18n keys existentes. Se agregan nuevas traducciones donde sea necesario.

