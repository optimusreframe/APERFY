# Plan de implementación: importación de inventario APERFY

> **Para agentes:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para dar seguimiento.

**Objetivo:** Añadir un flujo administrativo seguro para leer el ZIP de inventario, clasificar sus 209 productos en categorías limpias, mostrar una vista previa verificable, cargar las fotos y crear productos con stock real sin sobrescribir el catálogo existente de APERFY.

**Arquitectura:** La clasificación y la validación serán funciones puras en `src/lib/inventory-import/`, separadas del parser de ZIP/XLSX y de la UI. La pantalla administrativa leerá el ZIP en el navegador, generará una vista previa completa y solo permitirá importar cuando todas las filas tengan categoría, foto, precio, cantidad y un slug disponible. La escritura será idempotente mediante una clave de origen estable por fila/foto, con imágenes en `product-images` y productos vinculados a las categorías sembradas por migración.

**Tecnologías:** React 18, TypeScript, Vite, React Query, Supabase JS, Supabase Storage, Vitest, `xlsx` para `inventory.xlsx` y `jszip` para el contenedor ZIP.

## Restricciones globales

- Asignar exactamente una categoría primaria a cada fila.
- Preferir la categoría que una persona normal buscaría primero.
- Usar `3D Printing` para impresoras 3D, impresoras de resina, filamento, secadores/almacenamiento de filamento y equipos de postprocesado.
- Usar `Cell Phones & Accessories` para iPhones, OnePlus, fundas, accesorios MagSafe y productos específicos para teléfonos.
- Usar `Computers & Accessories` para laptops, monitores, periféricos, almacenamiento y accesorios específicos para laptops; tabletas y accesorios se agrupan aquí salvo que sean claramente de teléfono.
- Mantener duplicados del inventario como productos separados cuando difieran en foto, precio, modelo, marca o cantidad.
- Mantener intactas las categorías existentes `Accessories`, `Figurines` y `Home Decor`.
- No inventar traducciones, especificaciones, precios ni imágenes.
- `Item` alimenta `name_en` y `name_es` hasta contar con un flujo de traducción verificado.
- `Description` alimenta `description_en` y `description_es`, conservando marca y modelo.
- `Unit price` alimenta `base_price`; `Qty` alimenta `stock_quantity`.
- Todos los registros aprobados se crean con `inventory_enabled = true`, `low_stock_threshold = 3` e `is_active = true`.
- La vista previa debe mostrar totales, fotos, distribución de categorías, campos faltantes, duplicados y decisiones de fallback antes de escribir.
- La importación no puede sobrescribir ningún producto APERFY existente.

---

### Tarea 1: Añadir el parser y el clasificador deterministas

**Archivos:**
- Crear: `src/lib/inventory-import/types.ts`
- Crear: `src/lib/inventory-import/taxonomy.ts`
- Crear: `src/lib/inventory-import/classify.ts`
- Crear: `src/lib/inventory-import/preview.ts`
- Crear: `src/lib/inventory-import.test.ts`
- Modificar: `package.json`
- Modificar: `package-lock.json`

**Interfaces:**
- `InventorySourceRow` representa los 16 encabezados del XLSX: `Item`, `Brand`, `Model`, `Category`, `Qty`, `Unit`, `Status`, `AI %`, `Unit price`, `Total value`, `Currency`, `Department`, `Location`, `Created`, `Description`, `Photo file`.
- `InventoryImportRow` contiene `sourceRowNumber`, `sourceKey`, datos normalizados, `categorySlug`, `categoryReason`, `slug`, `photoFileName` y `issues: string[]`.
- `classifyInventoryRow(row: InventorySourceRow): { slug: string; reason: string }` devuelve una sola categoría aprobada y una razón legible.
- `buildImportPreview(rows: InventorySourceRow[], photoNames: Set<string>, existingSlugs: Set<string>): ImportPreview` no realiza efectos secundarios.
- `createUniqueInventorySlug(name: string, sourceRowNumber: number, usedSlugs: Set<string>): string` genera slugs deterministas; una colisión se marca como conflicto, nunca se reemplaza silenciosamente.

- [ ] **Paso 1: Instalar las dependencias de lectura local**

```bash
npm install jszip xlsx
```

Resultado esperado: `package.json` y el lockfile registran ambas dependencias.

- [ ] **Paso 2: Escribir las pruebas fallidas de clasificación y vista previa**

```ts
import { describe, expect, it } from 'vitest';
import { classifyInventoryRow } from './inventory-import/classify';
import { buildImportPreview } from './inventory-import/preview';

const row = (overrides: Record<string, unknown> = {}) => ({
  Item: 'USB-C charging cable', Brand: 'Example', Model: 'C100', Category: 'Electronics',
  Qty: 4, Unit: 'EA', Status: 'approved', 'AI %': 100, 'Unit price': 12.5,
  'Total value': 50, Currency: 'USD', Department: 'IT', Location: 'Shelf A',
  Created: '2026-10-08', Description: 'Braided cable', 'Photo file': 'cable.jpg', ...overrides,
});

describe('inventory taxonomy', () => {
  it('uses the most specific shopper category', () => {
    expect(classifyInventoryRow(row({ Item: 'iPhone 15 MagSafe case' })).slug)
      .toBe('cell-phones-accessories');
    expect(classifyInventoryRow(row({ Item: 'PLA filament 1.75mm' })).slug)
      .toBe('3d-printing');
  });

  it('reports missing photo and category fallback in the preview', () => {
    const preview = buildImportPreview(
      [row({ Item: 'Generic item', Category: 'Miscellaneous', 'Photo file': 'missing.jpg' })],
      new Set(),
      new Set(),
    );
    expect(preview.rows[0].issues).toContain('missing_photo');
    expect(preview.rows[0].categoryReason).toContain('Electronics');
    expect(preview.canImport).toBe(false);
  });
});
```

- [ ] **Paso 3: Ejecutar las pruebas para confirmar el fallo inicial**

```bash
npm test -- --run src/lib/inventory-import.test.ts
```

Resultado esperado: falla porque todavía no existen los módulos del importador.

- [ ] **Paso 4: Implementar el catálogo de 15 categorías y reglas de clasificación**

`taxonomy.ts` exportará `INVENTORY_CATEGORY_SLUGS` y el catálogo bilingüe. `classify.ts` normalizará `Item`, `Brand`, `Model` y `Description` a minúsculas sin acentos y aplicará reglas en este orden: `3d-printing`, `cell-phones-accessories`, `computers-accessories`, `video-games-consoles`, `automotive`, `sports-outdoors`, `toys-games`, `office-products`, `beauty-personal-care`, `health-household`, `pet-supplies`, `arts-crafts`, `tools-home-improvement`, `home-kitchen`, y finalmente `electronics`. La razón incluirá la regla que ganó; el fallback se marcará como decisión revisable.

- [ ] **Paso 5: Implementar normalización, slugs y validación de preview**

`preview.ts` convertirá `Qty` y `Unit price` a números finitos no negativos, exigirá `Status = approved`, `Currency = USD`, nombre no vacío, descripción no vacía y foto presente en el ZIP. Para nombres repetidos usará un sufijo estable `-inventory-<sourceRowNumber>`. Una colisión contra `existingSlugs` generará `existing_slug_conflict` y bloqueará el botón de importación.

- [ ] **Paso 6: Ejecutar las pruebas y verificar el contrato**

```bash
npm test -- --run src/lib/inventory-import.test.ts
npx tsc --noEmit
```

Resultado esperado: pruebas verdes y TypeScript sin errores.

- [ ] **Paso 7: Commit del núcleo puro**

```bash
git add package.json package-lock.json src/lib/inventory-import src/lib/inventory-import.test.ts
git commit -m "feat: add inventory import taxonomy and preview rules"
```

---

### Tarea 2: Sembrar las categorías limpias y la clave de importación

**Archivos:**
- Crear: `supabase/migrations/20261009040000_seed_inventory_taxonomy.sql`
- Modificar: `src/integrations/supabase/types.ts`

**Interfaces:**
- Las 15 categorías se insertan con `ON CONFLICT (slug) DO NOTHING`, por lo que la migración es repetible y no edita categorías existentes.
- `products.inventory_source_key` es nullable y único; las filas antiguas conservan `NULL` y las importaciones futuras pueden reanudarse sin duplicar.

- [ ] **Paso 1: Escribir una migración idempotente**

La migración debe ejecutar un `INSERT INTO public.categories (name_en, name_es, slug, icon, is_active)` por cada slug aprobado, sin modificar filas existentes. Después debe ejecutar:

```sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS inventory_source_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS products_inventory_source_key_key
  ON public.products (inventory_source_key)
  WHERE inventory_source_key IS NOT NULL;
```

- [ ] **Paso 2: Actualizar los tipos generados para la nueva columna**

Agregar `inventory_source_key: string | null` a Row, Insert y Update de `products` en `src/integrations/supabase/types.ts`, conservando todos los campos existentes.

- [ ] **Paso 3: Verificar la migración en Supabase**

Ejecutar la migración en el proyecto `xftxyvgplghnelawkhvl` y comprobar con SQL que existen exactamente los 15 slugs nuevos, que siguen existiendo las 3 categorías antiguas y que el índice único fue creado.

- [ ] **Paso 4: Ejecutar las comprobaciones locales**

```bash
npx tsc --noEmit
git diff --check
```

- [ ] **Paso 5: Commit del esquema**

```bash
git add supabase/migrations/20261009040000_seed_inventory_taxonomy.sql src/integrations/supabase/types.ts
git commit -m "feat: seed inventory taxonomy and source keys"
```

---

### Tarea 3: Crear la pantalla administrativa de selección y vista previa

**Archivos:**
- Crear: `src/pages/admin/AdminInventoryImport.tsx`
- Crear: `src/pages/admin/AdminInventoryImport.test.tsx`
- Modificar: `src/App.tsx`
- Modificar: `src/pages/admin/AdminSidebar.tsx`
- Modificar: `src/pages/admin/AdminLayout.tsx`

**Interfaces:**
- La ruta `/admin/inventory-import` exige `ProtectedRoute requireAdmin`.
- La pantalla recibe un ZIP mediante `<input type="file" accept=".zip,application/zip" />`.
- El estado de preview contiene `rows`, `categoryCounts`, `totalRows`, `totalPhotos`, `missingFields`, `duplicateNames`, `fallbackRows`, `slugConflicts` y `canImport`.
- El componente no llama a `products.insert` mientras `canImport` sea `false` o mientras el usuario no pulse el botón de importación después de revisar la vista previa.

- [ ] **Paso 1: Escribir la prueba de bloqueo de la vista previa**

La prueba renderizará la pantalla con un preview que contiene un campo faltante y comprobará que el botón `Importar productos` está deshabilitado, que se muestra el total de filas/fotos y que se informa el conflicto concreto.

- [ ] **Paso 2: Añadir la ruta y entrada de navegación**

Agregar importación de `AdminInventoryImport`, ruta hija `inventory-import`, título `INVENTORY IMPORT` y una entrada `INVENTORY IMPORT` bajo el bloque de catálogo del sidebar.

- [ ] **Paso 3: Leer el ZIP y encontrar el workbook y las fotos**

Usar `JSZip.loadAsync(file)`; localizar exactamente un archivo cuyo nombre termine en `inventory.xlsx` y mapear todos los `.jpg`, `.jpeg`, `.png` y `.webp` por nombre base/nombre completo. Leer la hoja `Inventory` con `XLSX.read(arrayBuffer, { type: 'array', cellDates: false })` y convertir cada fila con `XLSX.utils.sheet_to_json` usando los encabezados de la primera fila.

- [ ] **Paso 4: Presentar la vista previa completa**

Mostrar el total de filas, fotos, suma de unidades, tabla de distribución por categoría, lista de campos faltantes, nombres duplicados, fallbacks y conflictos de slug. Mostrar una tabla paginada o limitada a 20 filas inicialmente, con nombre, categoría, motivo, precio, cantidad, estado de stock y foto encontrada.

- [ ] **Paso 5: Implementar el gating de importación**

El botón queda deshabilitado si falta workbook, hay fotos faltantes, campos inválidos, estado distinto de `approved`, moneda distinta de `USD`, una fila sin categoría o una colisión de slug. El estado de error debe conservar el nombre de la fila y la razón, no solo un mensaje genérico.

- [ ] **Paso 6: Ejecutar pruebas de UI y build**

```bash
npm test -- --run src/pages/admin/AdminInventoryImport.test.tsx src/lib/inventory-import.test.ts
npx tsc --noEmit
npm run build
```

- [ ] **Paso 7: Commit de la vista previa**

```bash
git add src/pages/admin/AdminInventoryImport.tsx src/pages/admin/AdminInventoryImport.test.tsx src/App.tsx src/pages/admin/AdminSidebar.tsx src/pages/admin/AdminLayout.tsx
git commit -m "feat: add inventory import preview screen"
```

---

### Tarea 4: Implementar la escritura segura de imágenes, categorías y productos

**Archivos:**
- Modificar: `src/pages/admin/AdminInventoryImport.tsx`
- Modificar: `src/lib/inventory-import/preview.ts`
- Crear: `src/lib/inventory-import/persist.ts`
- Modificar: `src/lib/inventory-import.test.ts`

**Interfaces:**
- `persistInventoryImport(preview, files, categories, onProgress)` recibe solo un preview validado y devuelve `{ created, skipped, failed, uploadedPaths }`.
- Cada fila usa `inventory_source_key = "inventory:inventory.xlsx:" + sourceRowNumber + ":" + photoFileName`.
- Cada foto se guarda en `inventory-import/<sourceRowNumber>-<slug>.<ext>` dentro de `product-images`.
- `onProgress` recibe `{ completed, total, currentName, phase: 'image' | 'product' }`.

- [ ] **Paso 1: Escribir pruebas de persistencia con Supabase mockeado**

Cubrir que una fila válida crea un producto con `base_price`, `stock_quantity`, `inventory_enabled`, `low_stock_threshold`, `is_active`, `category_id`, `images` e `inventory_source_key`; que una clave ya existente se salta sin insertar; y que un error al insertar borra la foto recién cargada de Storage.

- [ ] **Paso 2: Implementar carga estable de fotos**

Crear un `Blob` desde la entrada ZIP, validar que sea una imagen y subirla con `upsert: false`. Si el objeto ya existe para la misma ruta, usarlo como reanudación y continuar; no borrar objetos que no pertenezcan al lote actual.

- [ ] **Paso 3: Implementar creación idempotente de productos**

Antes de cada inserción consultar por `inventory_source_key`. Si existe, incrementar `skipped` y no alterar el producto. Si no existe, insertar una sola fila con `images: [publicUrl]`, categoría por UUID y stock real. Si falla la inserción, eliminar únicamente la imagen que la fila actual acaba de subir y registrar el error por fila.

- [ ] **Paso 4: Añadir progreso, cancelación segura y resumen**

Procesar secuencialmente para no saturar Storage ni Postgres. Mostrar progreso por foto/producto, permitir cancelar antes de comenzar la siguiente fila y conservar el resumen de creados, omitidos y fallidos. Una cancelación no elimina productos ya creados.

- [ ] **Paso 5: Ejecutar pruebas focalizadas**

```bash
npm test -- --run src/lib/inventory-import.test.ts src/pages/admin/AdminInventoryImport.test.tsx
npx tsc --noEmit
```

- [ ] **Paso 6: Commit de persistencia**

```bash
git add src/pages/admin/AdminInventoryImport.tsx src/lib/inventory-import/preview.ts src/lib/inventory-import/persist.ts src/lib/inventory-import.test.ts
git commit -m "feat: persist inventory products with resumable imports"
```

---

### Tarea 5: Ejecutar el preview real del ZIP y la importación aprobada

**Archivos:**
- Fuente: `/Users/kong/Downloads/inventory-2026-10-08.zip`
- Extracción temporal: `/tmp/aperfy-inventory-APvnNh`
- Hoja: `inventory.xlsx`, rango `Inventory!A1:P210`

**Interfaces:**
- La importación se realiza desde `/admin/inventory-import` usando la sesión admin del usuario.
- El resultado debe ser verificable por consultas de lectura y no debe tocar las categorías ni productos APERFY existentes.

- [ ] **Paso 1: Cargar el ZIP y revisar el preview real**

Confirmar que el preview reporta 209 filas y 209 fotos, que no hay referencias faltantes, que las 15 categorías tienen distribución, que los 12 nombres duplicados reciben slugs distintos y que el total de unidades es 1,620.

- [ ] **Paso 2: Resolver cualquier fallback antes de escribir**

Revisar las filas clasificadas por fallback `electronics` y las decisiones ambiguas visibles en la tabla. Si una regla está mal, corregir el clasificador y volver al preview; no editar productos manualmente después de importar.

- [ ] **Paso 3: Pulsar Importar productos**

Iniciar la importación solo con `canImport = true`. Esperar el resumen final y conservar los conteos creados/omitidos/fallidos. Si hay fallos, reanudar con la misma clave de origen; nunca volver a crear una segunda copia con otro slug.

- [ ] **Paso 4: Verificar resultados en Supabase**

Comprobar que existen 209 productos con `inventory_source_key` no nulo, 209 imágenes públicas con rutas `inventory-import/`, suma de `stock_quantity = 1620`, `inventory_enabled = true` en todas las filas importadas, `low_stock_threshold = 3`, `is_active = true`, y cero cambios en los productos previos al lote.

- [ ] **Paso 5: Verificar comportamiento público de stock**

Abrir una ficha con stock mayor a 3, una con stock 1–3 y una con stock 0; comprobar las etiquetas disponible/pocas unidades/sold out, límite de cantidad y bloqueo de compra. Ejecutar checkout de una unidad en un producto de prueba y verificar que la reserva reduce el stock según la migración existente.

---

### Tarea 6: Verificación final y entrega

**Archivos:**
- Sin nuevos archivos; revisar todos los commits y cambios pendientes.

- [ ] **Paso 1: Ejecutar la suite completa**

```bash
npm test -- --run
npx tsc --noEmit
npm run lint -- --quiet
npm run build
git diff --check
```

El warning de tamaño de chunks existente se documenta por separado si continúa; los errores nuevos de TypeScript, build o las pruebas del importador deben quedar en cero.

- [ ] **Paso 2: Revisar aislamiento de cambios**

Verificar que los cambios previos de inventario (`src/lib/inventory.ts`, checkout, ProductDetail, ProductCard, AdminProducts y su migración) sigan presentes y que ningún archivo mencione `3dtoprint`, `lovable` o el backend provisional.

- [ ] **Paso 3: Crear commit de integración y preparar push**

```bash
git status --short
git log --oneline -6
git push origin feat/aperfy-rebrand
```

El push se hace únicamente después de que las comprobaciones locales y la verificación de Supabase sean verdes. La rama actual contiene el diseño ya committeado y los commits de implementación del importador.

- [ ] **Paso 4: Reportar evidencia**

Entregar el enlace al archivo de plan, commits creados, conteos reales importados, categorías asignadas, productos omitidos/fallidos, verificaciones de stock y cualquier limitación externa sin afirmar que la plataforma está lista si la importación o el smoke test no fueron confirmados.
