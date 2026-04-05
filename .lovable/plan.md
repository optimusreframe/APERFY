

# Loader "3D to Print" + Background Enrichment + AI Image Fidelity

## 1. Loader: Texto completo "3D to Print" con diseño responsivo

**Archivo**: `src/components/SplashLoader3D.tsx`

### Nuevas letras
Reemplazar los arrays de puntos actuales ("3", "D", "P") por puntos para las letras: **"3", "D", "t", "o", "P", "r", "i", "n", "t"** — formando "3D to Print". Esto incrementa de ~38 partículas a ~80-100.

### Layout responsivo con `useIsMobile`
- **Desktop** (>768px): Layout horizontal completo "3D to Print", cámara a z=12, fov=45. Escala 1.0.
- **Tablet** (768px): Layout en 2 líneas — "3D to" arriba, "Print" abajo. Cámara z=10, fov=50. Escala 0.85.
- **Mobile** (<768px): Layout en 2 líneas más compacto. Cámara z=9, fov=55. Escala 0.7. Partículas más pequeñas.

Se usa un hook `useResponsiveLayout()` interno que retorna `{ scale, cameraZ, fov, layout }` basado en `window.innerWidth` con listener de resize.

### Partículas de fondo temáticas
Agregar ~20-30 partículas decorativas adicionales que NO forman el logo:
- **Formas variadas**: Cilindros largos (filamentos), toroides (rollos/spools), cajas pequeñas (impresoras simplificadas), conos (hotends)
- Material semi-transparente dorado con baja opacidad (`opacity: 0.15-0.3`)
- Flotan permanentemente en el fondo (no se ensamblan), con rotación lenta y drift sutil
- Distribuidas en un radio amplio (z: -5 a -15) para crear profundidad
- Se implementan como un componente `BackgroundParticles` separado dentro del mismo archivo

### Geometrías de fondo (sin importar modelos externos)
- **Spool/Rollo**: `torusGeometry` con proportions de rollo
- **Filamento**: `cylinderGeometry` muy delgado y largo
- **Hotend**: `coneGeometry` invertido
- **Printer simplificada**: `boxGeometry` con un `boxGeometry` más pequeño encima (grupo)
- **Partículas finas**: `sphereGeometry` muy pequeñas como polvo

## 2. AI Image Generation: Fidelidad total al modelo original

**Archivo**: `supabase/functions/ai-product-import/index.ts`

Modificar los 3 prompts de `generate_image` (líneas 472-478) para enfatizar la preservación exacta del modelo:

**Instrucción base a agregar en TODOS los modos**:
```
"CRITICAL FIDELITY RULE: The 3D printed object must be reproduced with ABSOLUTE fidelity to the original image. Do NOT modify, alter, or reinterpret the object's design, colors, shape, size, proportions, textures, surface details, or any visual characteristic. The object must look EXACTLY like the original — same colors, same geometry, same style, same level of detail. The ONLY change is making it hyper-realistic with professional photography quality. You are changing the BACKGROUND and LIGHTING only, never the object itself."
```

Actualizar cada prompt:
- **system** (Estudio Maker): Agregar la regla de fidelidad + "hyper-realistic rendering of the exact same object"
- **ai** (Exhibición Tech): Igual + mantener cyberpunk background pero objeto intacto
- **custom**: Igual + compositing fiel del objeto sobre el fondo custom

## Archivos a modificar

- `src/components/SplashLoader3D.tsx` — reescritura completa con texto "3D to Print", layout responsivo, partículas de fondo
- `supabase/functions/ai-product-import/index.ts` — actualizar prompts de generate_image (líneas 469-478)

