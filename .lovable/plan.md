

# Potenciar el diálogo de Editar Producto con funcionalidades AI

## Problema actual

El diálogo de editar producto (líneas 1506-1789) es básico: solo permite subir fotos manualmente, editar campos de texto sin asistencia AI, y no tiene traducción automática ni generación de imagen. Toda la lógica AI existe solo en el flujo de "AI Import Studio".

## Solución

Agregar capacidades AI al diálogo de editar/crear producto, reutilizando las mismas funciones y edge functions que ya existen.

### Cambios en `src/pages/admin/AdminProducts.tsx`

**1. Botón "Generar Imagen AI" en la sección Media del diálogo de editar:**
- Agregar un botón junto al área de upload que abre un mini-panel inline
- El panel permite: subir foto original + seleccionar modo de fondo (Estudio Maker / Exhibición Tech / Custom) + botón "Generar con AI"
- Reutiliza `triggerAiGenerateImage()` y `persistAiImage()` que ya existen
- La imagen generada se agrega al array `mediaFiles` como nueva imagen

**2. Botones AI para Nombre y Descripción:**
- Agregar un botón `✨ Generar con AI` encima de los campos de nombre/descripción
- Al presionar, invoca el edge function con action `'enhance_product'` (nueva acción) que recibe el nombre/descripción actual + las imágenes del producto y genera versiones mejoradas en ES e EN
- También sugiere categoría (existente o nueva) y genera slug automático en inglés

**3. Botón "Traducir con AI" para campos EN:**
- Agregar botón junto a los campos EN (nombre y descripción) que invoca la acción `translate` existente del edge function
- Genera `name_en` y `description_en` desde los campos ES
- Auto-genera el slug desde el nombre EN

**4. Traducción AI en Variaciones:**
- Agregar botón "Traducir" junto al campo `Nombre (EN)` de cada variación
- Invoca la misma acción `translate` para convertir `name_es` → `name_en`

### Nueva acción en edge function `supabase/functions/ai-product-import/index.ts`

**Acción `enhance_product`:**
- Recibe: `name_es`, `description_es`, `existingCategories`, imagen(es) del producto (opcional)
- Genera: nombre mejorado (ES/EN, max 4 palabras), descripción mejorada (ES/EN, max 150 chars), categoría sugerida, slug EN
- Reutiliza el mismo modelo y prompt style del scrape pero adaptado para productos existentes

### Estado adicional en el componente

- `editAiImageOpen`: boolean para mostrar/ocultar el panel de generación de imagen AI dentro del diálogo de editar
- `editAiSourceImage`: string | null para la foto fuente subida
- `editAiBgMode`: 'system' | 'ai' | 'custom'
- `editAiGenerating`: boolean para loading states
- `editTranslating`: boolean para traducción en progreso

### Flujo UX

1. **Imagen**: Usuario ve sus fotos actuales + botón "✨ Generar con AI" → sube foto original → elige fondo → genera → imagen se agrega a media
2. **Texto**: Usuario presiona "✨ Generar con AI" → AI genera nombre, descripción, categoría, slug en ambos idiomas basándose en las imágenes y texto existente
3. **Traducción**: Usuario escribe en ES → presiona "🔄 Traducir" junto a campos EN → AI traduce y genera slug
4. **Variaciones**: Usuario escribe nombre ES → presiona "🔄" junto a Nombre EN → AI traduce

## Archivos a modificar

- `src/pages/admin/AdminProducts.tsx` — agregar UI y lógica AI al diálogo de editar
- `supabase/functions/ai-product-import/index.ts` — agregar acción `enhance_product`

