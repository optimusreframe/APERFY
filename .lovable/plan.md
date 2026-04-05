

# Actualizar Logo y Favicon del Website

## Resumen

Reemplazar el logo actual (insignia "3D" generada con CSS) por la imagen subida del nuevo logo en todo el sitio, y usarla tambien como favicon.

## Cambios

### 1. Copiar la imagen al proyecto

- Copiar `user-uploads://Photoroom_20260405_011813.png` a `src/assets/logo.png` (para componentes React)
- Copiar tambien a `public/logo.png` (para favicon y meta tags)
- Eliminar `public/favicon.ico` existente

### 2. Actualizar `index.html`

- Reemplazar la referencia al favicon con `<link rel="icon" href="/logo.png" type="image/png">`
- Actualizar las meta tags de og:image y twitter:image con `/logo.png`

### 3. Actualizar `src/components/Navbar.tsx` (lineas 84-94)

- Reemplazar el div con gradiente dorado y texto "3D" por una etiqueta `<img>` importando el logo desde `@/assets/logo.png`
- Mantener el texto "3DtoPrint" al lado

### 4. Actualizar `src/components/Footer.tsx` (lineas 12-18)

- Mismo cambio: reemplazar el cuadro CSS "3D" por la imagen del logo

### 5. Actualizar `src/pages/Auth.tsx` (lineas 180-191)

- Reemplazar la insignia "3D" por la imagen del logo (version mas grande, ~14x14)

### 6. Actualizar `src/pages/admin/AdminLayout.tsx` (linea 13-14)

- Agregar la imagen del logo antes del texto "3DtoPrint Admin"

## Archivos modificados

- `index.html`
- `src/components/Navbar.tsx`
- `src/components/Footer.tsx`
- `src/pages/Auth.tsx`
- `src/pages/admin/AdminLayout.tsx`

