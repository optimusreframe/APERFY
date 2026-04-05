

# Actualizar AI Product Import — Textos Concisos + Imágenes Generadas

## Resumen

Tres cambios principales: (1) forzar textos ultra-cortos en el prompt de extracción, (2) reemplazar los prompts de generación de imagen con los tres prompts específicos del usuario, y (3) pasar `reference_image_url` desde el scrape y conectar correctamente el `backgroundMode` con el backend.

## Cambios

### 1. `supabase/functions/ai-product-import/index.ts` — Acción `scrape`

**Prompt del sistema**: Reescribir para exigir:
- `name_es` / `name_en`: Nombre NUEVO, max 4 palabras, NO copiar el original
- `description_es` / `description_en`: Max 2-3 oraciones, aprox 150 caracteres
- Nuevo campo en el tool schema: `reference_image_url` — la mejor URL de imagen del producto extraída de Firecrawl

Agregar `reference_image_url` al schema de la tool function `extract_product_data` y al array `required`.

### 2. `supabase/functions/ai-product-import/index.ts` — Acción `generate_image`

Reemplazar toda la lógica de prompts con tres ramas claras basadas en `backgroundMode`:

- **`"system"`**: Prompt de studio gris cálido con sombras suaves (el proporcionado por el usuario)
- **`"ai"` (premium)**: Prompt del plinto de concreto oscuro + cobre + neón azul + logo 3DtoPrint (el proporcionado por el usuario)
- **`"custom"`**: Prompt de composición sobre background subido (el proporcionado por el usuario)

Eliminar la lógica actual de selección por categoría (`figuras`, `funcional`, etc.) y los prompts largos de galería/ingeniería. Los tres prompts nuevos cubren todos los casos.

Si `customBackground` se proporciona con modo `"custom"`, adjuntar como segunda imagen. Si modo `"system"`, adjuntar el `customBackground` (que viene del `systemBgSetting`). Si modo `"ai"`, no adjuntar segunda imagen.

### 3. `src/pages/admin/AdminProducts.tsx` — Conexión frontend

**En `handleAiScrape`**:
- Después del scrape exitoso, guardar `data.data.reference_image_url` como la imagen fuente seleccionada (`aiSelectedSourceImage`) si el admin NO subió una foto manual
- Si el admin subió una foto original (`aiOriginalImage`), usar esa en lugar de la de Firecrawl

**En `handleAiGenerateImage`**:
- Ya envía `backgroundMode: aiBgMode` — verificar que los valores coinciden (`system`, `ai`, `custom`)
- Confirmar que `sourceImage` usa la prioridad: foto subida manualmente > `reference_image_url` > primera imagen extraída

**En `handleAiSaveProduct`**:
- Ya funciona correctamente: toma `aiGeneratedImage` y la convierte en File para el formulario

## Detalle técnico — Prompts exactos

Los tres prompts de imagen serán literalmente los que proporcionaste, sin modificación.

## Archivos modificados
1. `supabase/functions/ai-product-import/index.ts` — prompts de scrape y generate_image
2. `src/pages/admin/AdminProducts.tsx` — manejo de `reference_image_url` post-scrape

