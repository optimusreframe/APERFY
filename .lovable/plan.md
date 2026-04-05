

# Banners con Swipe + Trending Section Premium

## 1. HeroBanner — Soporte para deslizar (swipe/drag)

Agregar gestos de arrastre con `framer-motion` al contenedor del banner:
- Usar `onDragEnd` con detección de dirección (deltaX > threshold → cambiar slide)
- En desktop: funciona con mouse drag
- En mobile: funciona con touch swipe
- Resetear progress bar al cambiar slide manualmente
- Agregar `cursor-grab` / `cursor-grabbing` para feedback visual

**Archivo**: `src/components/landing/HeroBanner.tsx`

## 2. TrendingSection — Rediseño premium destacado

El problema actual: las cards de trending se ven casi idénticas a las del grid principal, causando sensación de duplicación.

### Diferenciación visual:
- **Contenedor**: Fondo con gradiente sutil dorado + borde `border-primary/20` + glow `shadow-[0_0_20px_rgba(212,160,23,0.08)]` para separar visualmente la sección completa
- **Cards más grandes**: Ancho de `200px/220px` → `240px/280px` con aspect ratio más alto
- **Ranking badge premium**: Reemplazar el badge simple `🔥 #1` por un badge con gradiente dorado, icono de corona/trofeo para top 3, y efecto shimmer animado
- **Overlay gradiente**: Agregar un gradiente oscuro en la parte inferior de la imagen para texto legible superpuesto
- **Texto sobre imagen**: Mover nombre y precio sobre la imagen con fondo gradiente, estilo más cinematográfico
- **Efecto hover 3D**: Usar `perspective` + `rotateY` sutil en hover para efecto de profundidad
- **Glow en hover**: Borde dorado brillante al pasar el mouse
- **Soporte touch/drag**: Igual que el banner, permitir deslizar con touch/mouse usando drag events nativos

### Header de sección:
- Título más grande con gradiente dorado
- Subtítulo descriptivo ("Los modelos más populares" / "Most popular models")
- Línea decorativa dorada debajo

**Archivo**: `src/components/landing/TrendingSection.tsx`

## Archivos a modificar

- `src/components/landing/HeroBanner.tsx` — agregar drag/swipe gesture
- `src/components/landing/TrendingSection.tsx` — rediseño premium completo con drag

