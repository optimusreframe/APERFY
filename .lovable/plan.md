

# Precio por Peso/Material + Variaciones de Tamaño

## Resumen

Tres cambios principales:
1. Agregar campo `cost_per_kg` a la tabla `materials` y UI en AdminMaterials para configurarlo
2. Agregar campos `weight_grams` y `size_label` a `product_variations` para que cada variación de tamaño tenga peso y el precio se calcule automáticamente
3. Refactorizar el ProductDetail para mostrar tamaño, peso, material y precio calculado dinámicamente al seleccionar variación

## Cambios en Base de Datos (2 migraciones)

**Migración 1 — Agregar `cost_per_kg` a `materials`:**
```sql
ALTER TABLE public.materials ADD COLUMN cost_per_kg numeric NOT NULL DEFAULT 0;
```
Esto permite configurar el costo total por kg de cada filamento (incluyendo tiempo, labor, etc.).

**Migración 2 — Agregar `weight_grams` a `product_variations`:**
```sql
ALTER TABLE public.product_variations ADD COLUMN weight_grams numeric DEFAULT NULL;
```
Cada variación de tipo "size" tendrá su peso en gramos. El precio se calcula: `(weight_grams / 1000) * material.cost_per_kg`.

## Cambios en Código

### 1. `src/pages/admin/AdminMaterials.tsx`
- Agregar campo `cost_per_kg` al formulario (input numérico con label "Costo por KG ($)")
- Mostrar columna de costo en la tabla de materiales
- Actualizar el tipo `MaterialForm` para incluir `cost_per_kg`

### 2. `src/pages/admin/AdminProducts.tsx`
- En el modal de crear/editar producto, agregar sección "Variaciones" donde se puedan:
  - Agregar variaciones de tipo `size` con: nombre (S/M/L/XL o custom), `weight_grams`, y selección de material
  - El `price_modifier` se calcula automáticamente: `(weight_grams / 1000) * selectedMaterial.cost_per_kg - base_price`
  - CRUD inline de variaciones asociadas al producto
- Agregar campos `weight_grams` (peso base del modelo) al formulario del producto para referencia

### 3. `src/pages/ProductDetail.tsx`
- Cuando el usuario selecciona una variación de tipo "size":
  - Mostrar el peso de esa variación (ej: "150g")
  - Recalcular el precio total usando `price_modifier` de la variación
- En la sección de especificaciones, mostrar: tamaño seleccionado, peso, material(es), color
- Si no hay variación seleccionada, mostrar el `base_price` como ahora

### 4. `src/i18n/translations.ts`
- Agregar traducciones: "Peso", "Tamaño", "Costo por KG", "gramos", etc.

## Flujo del Cálculo de Precio

```text
Admin configura:
  Material "PETG" → cost_per_kg = $50

Admin crea producto con variaciones:
  Variación "Small"  → weight_grams = 100  → precio = (100/1000) * 50 = $5
  Variación "Medium" → weight_grams = 200  → precio = (200/1000) * 50 = $10
  Variación "Large"  → weight_grams = 350  → precio = (350/1000) * 50 = $17.50

Cliente ve en ProductDetail:
  Selecciona "Medium" → muestra "200g" y "$10.00"
```

## Archivos a modificar
- `src/pages/admin/AdminMaterials.tsx` — campo cost_per_kg
- `src/pages/admin/AdminProducts.tsx` — gestión de variaciones size/weight en el modal
- `src/pages/ProductDetail.tsx` — mostrar peso y precio dinámico por variación
- `src/i18n/translations.ts` — nuevas traducciones
- 2 migraciones de base de datos

