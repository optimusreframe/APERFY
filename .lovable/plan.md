

# Actualización AI Import Studio — Maker-Pro Aesthetic

## Resumen

Rediseñar el selector de fondo del modal AI Import con tarjetas estilo card, nuevos nombres/descripciones, prompts mejorados en el Edge Function, y un Progress Log animado durante la generación.

## Cambios

### 1. Edge Function — Nuevos prompts (`supabase/functions/ai-product-import/index.ts`)

Reemplazar los prompts de `backgroundMode === "system"` y el default `"ai"`:

- **`system` → "Estudio Maker"**: `"High-fidelity photography of a 3D printed object on a grey industrial workbench. Background: Blurred professional 3D printer and colorful filament spools (orange/teal). Macro lens aesthetic, heavy bokeh, cinematic studio lighting with a cool rim light on the object edges."`
- **`ai` → "Exhibición Tech"**: `"Luxury product display. Object placed on a dark carbon-fiber plinth. Background: Intricate 3D geometric network nodes in dark blue/grey. '3DtoPrint' logo subtly engraved in copper/gold on the plinth. Cyberpunk technology aesthetic."`
- `custom` permanece igual.

### 2. Frontend — Card-style radio selector (`AdminProducts.tsx`, líneas ~637-680)

Reemplazar el `RadioGroup` plano con tarjetas interactivas:

- Cada opción será un `div` clickeable con borde `border-2`, que cambia a `border-primary` (gold) cuando está activo.
- Hover: `hover:border-primary/50` con `transition-all duration-200`.
- Contenido de cada card:
  - **system**: Título "Estudio Maker (Recomendado)" + sub-label "Fondo hiperrealista de taller con impresora 3D y desenfoque cinematográfico" + badge "Recomendado".
  - **ai**: Título "Exhibición Tech Abstracta" + sub-label "Estilo geométrico oscuro con nodos de red y marca 3DtoPrint grabada".
  - **custom**: Título "Fondo Personalizado" + sub-label "Sube tu propia imagen de fondo".
- Se mantiene `RadioGroupItem` oculto para accesibilidad, el click en la card cambia el valor.

### 3. Progress Log overlay durante generación (líneas ~777-785)

Cuando `aiImageLoading === true`, superponer sobre el preview un overlay oscuro con mensajes secuenciales animados:

```text
┌─────────────────────────┐
│  ◉ Aislando modelo 3D...│  (0-2s)
│  ◉ Configurando ilumina…│  (2-4s)
│  ◉ Aplicando efecto …   │  (4-6s)
│  ◉ Renderizando en 8K…  │  (6s+)
│  [spinner]               │
└─────────────────────────┘
```

Implementación: un array de strings con `useEffect` + `setInterval` que avanza el índice cada ~2.5s. Cada mensaje aparece con `animate-fade-in`. El overlay tiene `bg-black/70 backdrop-blur-sm` y un borde interno con `shadow-[inset_0_0_30px_rgba(212,160,23,0.15)]`.

### 4. Image preview con inner glow (línea ~777)

Agregar al contenedor del preview la clase: `shadow-[inset_0_0_40px_rgba(212,160,23,0.1)]` cuando hay una imagen generada exitosamente.

### 5. Botón "Extraer y Generar" con pulse animation

Cuando `aiLoading || aiImageLoading`, agregar clase `animate-pulse` al botón principal de scrape/generación.

### 6. Cambiar default de `aiBgMode`

En `resetAi()` (línea 369), cambiar el default de `'ai'` a `'system'` ya que "Estudio Maker" será la opción recomendada.

## Archivos a modificar

- `supabase/functions/ai-product-import/index.ts` — prompts (2 líneas)
- `src/pages/admin/AdminProducts.tsx` — UI del selector, progress log, glow, default mode

