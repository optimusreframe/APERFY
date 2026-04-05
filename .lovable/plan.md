

# Consolidar Store en la Página Principal

## Resumen

Eliminar `/3dmodels` como página separada. Mover los filtros avanzados de Store (precio, materiales, sidebar colapsable, toggle de grid) al Index. Redirigir `/3dmodels` a `/` para no romper links existentes. Mantener `/3dmodels/:slug` para el detalle de producto.

## Cambios

### 1. `src/pages/Index.tsx`
Incorporar las funcionalidades exclusivas de Store que faltan:
- Sidebar de filtros colapsable (precio, materiales, categorías con checkbox)
- Toggle de grid 3/4 columnas
- Filtro por rango de precio

### 2. `src/App.tsx`
- Eliminar la ruta `/3dmodels` → `<Store />`
- Agregar redirect: `/3dmodels` → `/` (usando `<Navigate to="/" replace />`)
- Mantener `/3dmodels/:slug` → `<ProductDetail />`
- Eliminar import de `Store`

### 3. Referencias a `/3dmodels` → `/`
Actualizar links en estos archivos:
- `src/components/Navbar.tsx` — nav link apunta a `/`
- `src/components/Footer.tsx` — footer link
- `src/components/ProductCard.tsx` — links a producto usan `/3dmodels/:slug` (se mantienen)
- `src/components/landing/HeroBanner.tsx` — CTA href
- `src/pages/Cart.tsx` — "Continue shopping" link
- `src/pages/ProductDetail.tsx` — breadcrumb y "back" link

**Nota**: Los links a `/3dmodels/:slug` (detalle de producto) **no cambian** — esa ruta sigue activa.

### 4. Eliminar `src/pages/Store.tsx`

### 5. Limpiar import de `Catalog.tsx` en App.tsx
La ruta `/catalog` también parece redundante ahora. Se puede eliminar o mantener según prefieras — el plan por defecto la mantiene ya que tiene funcionalidad diferente (WhatsApp ordering).

## Archivos Modificados
1. `src/pages/Index.tsx` — agregar filtros avanzados de Store
2. `src/App.tsx` — redirect `/3dmodels` → `/`, eliminar Store
3. `src/components/Navbar.tsx` — actualizar link
4. `src/components/Footer.tsx` — actualizar link
5. `src/components/landing/HeroBanner.tsx` — actualizar CTA
6. `src/pages/Cart.tsx` — actualizar links
7. `src/pages/ProductDetail.tsx` — actualizar breadcrumb
8. Eliminar `src/pages/Store.tsx`

