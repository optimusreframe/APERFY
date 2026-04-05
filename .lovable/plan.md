

# Pricing Inteligente vía eBay + Bulk Import (hasta 10 URLs)

## Situación actual del precio

Actualmente, el precio lo "inventa" la IA. En el prompt del Edge Function se le dice: `"suggested_price: Reasonable retail price in USD for a 3D printed product"`. Gemini simplemente adivina un precio sin consultar datos reales del mercado. No hay scraping de precios ni comparación con listings existentes.

## Cambios propuestos

### 1. Pricing inteligente con datos de eBay (Edge Function)

Agregar un nuevo paso en la acción `scrape` del Edge Function `ai-product-import`:

- **Después** de extraer el título/nombre del producto con Gemini, usar **Firecrawl Search** para buscar en eBay productos similares:
  - Query: `site:ebay.com {original_title OR name_en} 3D printed`
  - Limitar a 6 resultados
  - Scrape del contenido de cada resultado para extraer el precio
- **Enviar los precios encontrados a Gemini** como contexto adicional para que calcule un promedio ponderado y lo devuelva como `suggested_price`
- Si Firecrawl no encuentra resultados o no hay API key, mantener el fallback actual (precio estimado por la IA)

**Flujo técnico:**
```text
URL → Firecrawl scrape página → Gemini extrae metadata + título original
  → Firecrawl search "site:ebay.com {título}" (4-6 resultados)
  → Gemini analiza precios encontrados → suggested_price = promedio
```

**Cambio en el prompt de Gemini:** Agregar los precios de eBay como contexto:
```
EBAY MARKET PRICES FOUND:
1. $12.99
2. $15.50
3. $11.00
...
Calculate suggested_price as the average of these market prices.
```

### 2. Bulk Import — hasta 10 URLs simultáneas

Agregar una tercera pestaña/modo en el modal de AI Import: **"Importar en lote (URLs)"**.

**UI en `AdminProducts.tsx`:**
- Nuevo paso `source` con opción de tabs: "URL única" | "Lote (hasta 10)"
- En modo lote: un `<textarea>` donde el admin pega hasta 10 URLs (una por línea)
- Botón "Importar Lote" que valida las URLs y lanza el proceso
- Vista de progreso tipo lista con estado por cada URL:
  - ⏳ En cola → 🔄 Scraping → 🖼️ Generando imagen → ✅ Creado / ❌ Error
- Cada producto se crea automáticamente con los valores por defecto (Estudio Maker, categoría sugerida, precio de mercado)
- Al finalizar, mostrar resumen: X productos creados, Y errores

**Lógica en el frontend:**
- Procesar URLs secuencialmente (no en paralelo) para evitar rate limits
- Para cada URL: scrape → generar imagen → guardar producto (reutilizando `handleAiScrape` + `handleAiSaveProduct` internos)
- No hay paso de "review" en modo bulk — todo es automático

**Nueva acción en Edge Function** `ai-product-import`:
- Acción `scrape_and_price`: combina el scrape actual + búsqueda de precios en eBay en una sola llamada
- Se usa tanto para import individual como bulk

### 3. Archivos a modificar

- **`supabase/functions/ai-product-import/index.ts`** — Agregar búsqueda de precios en eBay con Firecrawl Search dentro de la acción `scrape`, actualizar prompt de Gemini con precios de mercado
- **`src/pages/admin/AdminProducts.tsx`** — Agregar modo "Bulk Import" con textarea, progress tracker por URL, y lógica de procesamiento secuencial con auto-save

### Sección técnica

**Búsqueda de precios (Edge Function):**
```typescript
// Después de obtener el título del producto...
if (FIRECRAWL_API_KEY) {
  const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: { "Authorization": `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `site:ebay.com ${originalTitle} 3D printed`,
      limit: 6,
      scrapeOptions: { formats: ["markdown"] }
    })
  });
  // Extraer precios con regex del markdown de cada resultado
  // Pasar lista de precios a Gemini para calcular promedio
}
```

**Bulk Import (Frontend):**
```typescript
const handleBulkImport = async (urls: string[]) => {
  for (const url of urls) {
    updateBulkStatus(url, 'scraping');
    // 1. Scrape + price
    // 2. Generate image
    // 3. Auto-save product
    updateBulkStatus(url, 'done');
  }
};
```

