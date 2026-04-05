

# Background Animado de Impresión 3D

## Enfoque

Crear un componente `PrintingBackground` con elementos SVG ligeros (partículas, trozos de filamento, rollos, objetos 3D, siluetas de impresoras Bambulab) que flotan suavemente usando CSS animations puras — sin canvas ni WebGL para mantener el rendimiento.

## Implementación

### 1. Nuevo componente `src/components/PrintingBackground.tsx`

- ~15-20 elementos SVG inline posicionados absolutamente con `pointer-events-none` y `z-index: 0`
- Cada elemento tiene: posición aleatoria fija (no re-renderiza), opacidad muy baja (0.03-0.08), tamaño variado (16-48px), color dorado (#D4A017) para mantener la estética
- Animaciones CSS puras: `float` (ya existe en tailwind), rotación lenta, drift horizontal sutil
- Los SVGs representarán:
  - **Partículas/puntos**: círculos pequeños dorados
  - **Trozos de filamento**: líneas curvas SVG
  - **Rollos de filamento**: círculo con hueco central (spool shape)
  - **Objetos 3D**: cubo isométrico simple, esfera con líneas de capa
  - **Impresora Bambulab**: silueta simplificada tipo caja con eje
- Componente usa `useMemo` para generar posiciones una sola vez
- Todo envuelto en `fixed inset-0 overflow-hidden pointer-events-none` con `z-index: 0`

### 2. Nuevos keyframes en `tailwind.config.ts`

- `drift`: movimiento horizontal sutil (±30px) en 20-40s
- `float-slow`: variante más lenta del float existente (15-25s)
- `rotate-slow`: rotación completa en 30-60s

### 3. Integración en `src/App.tsx`

- Renderizar `<PrintingBackground />` fuera de las rutas admin (antes del `<Routes>`)
- Usar `useLocation` para ocultar en rutas `/admin*`

### 4. Performance

- Solo CSS animations (GPU-accelerated via `transform` y `opacity`)
- Sin JavaScript animation loops, sin requestAnimationFrame
- Elementos con `will-change: transform` para composición GPU
- Opacidad muy baja para que no distraiga del contenido
- ~15 elementos máximo en pantalla

## Archivos

- **Crear**: `src/components/PrintingBackground.tsx`
- **Editar**: `tailwind.config.ts` (keyframes drift/float-slow/rotate-slow)
- **Editar**: `src/App.tsx` (agregar componente condicionalmente fuera de admin)

