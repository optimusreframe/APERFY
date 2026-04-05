

# Correcciones: Banners con páginas reales, dominio y logo OG

## Problema 1: Banners apuntan a /catalog sin sentido

Los banners 3 ("Fast & Reliable Printing") y 4 ("Custom Colors & Materials") apuntan a `/catalog` sin contexto relevante. Además, el banner 1 dice "calidad museo" que debe cambiarse.

### Solución

- **Banner 1** ("Premium 3D Printed Models"): Cambiar subtítulo a enfocarse en "alta calidad" sin mención de museo. Mantener href a `/` (home/marketplace).
- **Banner 2** ("Can't Find Your Model?"): Ya apunta a `/request-model` — correcto.
- **Banner 3** ("Fast & Reliable Printing"): Crear nueva página `/our-process` con contenido sobre el proceso de impresión con Bambu Lab (velocidad, precisión, tecnología).
- **Banner 4** ("Custom Colors & Materials"): Crear nueva página `/materials` con información sobre los materiales disponibles (PLA, PETG, ABS, TPU) y sus características.
- **Banner 5** ("Join the Community"): Ya apunta a `/auth` — correcto.

### Nuevas páginas a crear

**`src/pages/OurProcess.tsx`**: Página informativa con secciones sobre tecnología Bambu Lab, proceso de impresión paso a paso, calidad y velocidad. Diseño premium con iconos y gradientes dorados consistentes con el resto del sitio.

**`src/pages/Materials.tsx`**: Página con tarjetas para cada material (PLA, PETG, ABS, TPU) mostrando propiedades, usos recomendados y acabados disponibles. Diseño con cards estilo glass-morphism.

Agregar ambas rutas en `App.tsx`.

## Problema 2: Dominio incorrecto en compartidos

`PUBLIC_URL` en `ShareMenu.tsx` y `Catalog.tsx` usa `https://a3dtoprint.lovable.app` en lugar de `https://3dtoprint.online`.

### Solución

Cambiar `PUBLIC_URL` a `https://3dtoprint.online` en:
- `src/components/ShareMenu.tsx` (línea 13)
- `src/pages/Catalog.tsx` (línea 24)

## Problema 3: Logo OG incorrecto en WhatsApp/social shares

La imagen OG en `index.html` usa una URL temporal de Google Storage que no muestra el logo correcto de 3DtoPrint.

### Solución

- Copiar el logo subido (imagen 2, el "3P" negro/dorado) a `public/og-image.png`
- Actualizar `index.html` meta tags `og:image` y `twitter:image` para usar `https://3dtoprint.online/og-image.png` (URL absoluta al dominio real)
- Actualizar `og:url` a `https://3dtoprint.online`

## Archivos

- **Crear**: `src/pages/OurProcess.tsx`, `src/pages/Materials.tsx`
- **Editar**: `src/components/landing/HeroBanner.tsx` (hrefs + subtítulo banner 1)
- **Editar**: `src/App.tsx` (nuevas rutas)
- **Editar**: `src/components/ShareMenu.tsx` (PUBLIC_URL)
- **Editar**: `src/pages/Catalog.tsx` (PUBLIC_URL)
- **Editar**: `index.html` (og:image, og:url meta tags)
- **Copiar**: logo OG a `public/og-image.png`

