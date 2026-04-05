

# Búsqueda Avanzada de Precios en eBay — Multi-Estrategia

## Problema actual

La búsqueda actual es una sola query: `site:ebay.com {scrapedTitle} 3D printed`. Si el título del producto fuente es largo, genérico o no coincide con cómo se lista en eBay, la búsqueda falla o devuelve resultados irrelevantes con precios incorrectos.

## Solución: Búsqueda en 3 fases con validación AI

### Fase 1 — Generar queries inteligentes con Gemini

Antes de buscar en eBay, usar Gemini para analizar el contenido scrapeado y generar **3-4 queries de búsqueda optimizadas**:

- Query por título exacto: `site:ebay.com "{original title}" 3D printed`
- Query por keywords: `site:ebay.com {keywords principales} 3D print figurine/model`
- Query por categoría/tipo: `site:ebay.com {tipo de objeto} {franquicia/personaje} 3D printed`
- Query simplificada: `site:ebay.com {nombre corto} 3D print`

Esto se hace con una llamada rápida a Gemini Flash Lite (barata y rápida) que recibe el título y descripción scrapeados y devuelve un array de queries optimizadas.

### Fase 2 — Ejecutar búsquedas paralelas en Firecrawl

Lanzar las 3-4 queries en paralelo con `Promise.allSettled()` contra Firecrawl Search, cada una con `limit: 4`. Esto maximiza la cobertura sin multiplicar el tiempo de espera.

Extraer precios de todos los resultados combinados usando el regex existente `extractPricesFromText`.

### Fase 3 — Filtrar precios con AI (validación de relevancia)

Pasar a Gemini los resultados crudos (título + precio de cada listing encontrado) junto con la descripción del producto original. Gemini debe:

1. Descartar listings que NO sean del mismo producto o similares
2. De los relevantes, calcular el precio promedio
3. Devolver `suggested_price`, `price_confidence` (high/medium/low), y `matched_listings` (cantidad usada)

### Cambios técnicos en `ai-product-import/index.ts`

**Nuevo helper `generateEbayQueries`**: Llamada a Gemini Flash Lite con tool calling que devuelve `{ queries: string[] }`.

**Nuevo helper `searchEbayMulti`**: Ejecuta múltiples búsquedas Firecrawl en paralelo, deduplica resultados por URL.

**Nuevo helper `validateAndAveragePrices`**: Llamada a Gemini Flash que recibe los listings encontrados + contexto del producto y devuelve precio validado con nivel de confianza.

**Flujo actualizado del action `scrape`**:
```text
1. Firecrawl scrape URL → contenido + título
2. Gemini Flash Lite → genera 3-4 queries eBay optimizadas
3. Firecrawl Search × 3-4 en paralelo → listings con precios
4. Gemini Flash → filtra irrelevantes, promedia relevantes
5. Gemini Flash → extrae metadata producto (con precio validado)
```

**Respuesta enriquecida**: Agregar al response `price_confidence`, `matched_listings_count`, y `search_queries_used` para que el frontend pueda mostrar el nivel de confianza del precio.

### Cambios en `AdminProducts.tsx`

- Mostrar indicador de confianza del precio: 🟢 Alta (3+ matches), 🟡 Media (1-2 matches), 🔴 Baja (estimado AI)
- Agregar las queries usadas en un tooltip/expandible para transparencia

### Archivo a modificar

- `supabase/functions/ai-product-import/index.ts` — lógica de búsqueda multi-query + validación AI
- `src/pages/admin/AdminProducts.tsx` — indicador de confianza del precio

