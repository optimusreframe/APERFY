

# Slug en inglés + Edición en Bulk

## 1. Slug basado en idioma seleccionado

**Problema**: El slug siempre se genera desde `name_es`, incluso cuando se activa la versión en inglés.

**Solución**: Modificar la lógica para que:
- Cuando `showEnglish` esté activo y `aiData.name_en` tenga valor, el slug auto-generado use `slugify(aiData.name_en)`
- Cuando `showEnglish` esté desactivado o no haya `name_en`, el slug se genera desde `name_es` (comportamiento actual)
- Al activar el toggle de inglés o al ejecutar `handleTranslateToEnglish`, regenerar el slug desde el nombre en inglés si `slugLocked` está activo

**Cambios en `AdminProducts.tsx`**:
- Actualizar el `useEffect` de auto-slug (línea 248-253) para considerar `showEnglish` y `aiData.name_en`
- En el callback de `handleTranslateToEnglish`, después de recibir la traducción, actualizar el slug si `slugLocked`
- En el `onCheckedChange` del switch de inglés, recalcular slug si se desactiva inglés (volver a español)

## 2. Edición en Bulk desde la tabla de productos

**Funcionalidad**: Agregar modo de edición inline en la tabla de productos del admin, permitiendo editar precio, categoría, nombre y estado de múltiples productos sin abrir modales individuales.

**UI**:
- Botón "Editar en Bulk" junto al botón de "Agregar Producto"
- Al activar modo bulk, la tabla cambia a modo editable:
  - Checkbox en cada fila para seleccionar productos
  - Nombre (ES): se convierte en Input editable
  - Precio: se convierte en Input numérico
  - Categoría: se convierte en Select dropdown
  - Estado (Activo/Inactivo): se convierte en Switch
- Barra de acciones flotante al seleccionar productos: "Guardar Cambios" y "Cancelar"
- Los cambios se guardan todos de una vez al hacer clic en "Guardar Cambios"

**Lógica**:
- Estado `bulkEditMode: boolean` para activar/desactivar el modo
- Estado `bulkEdits: Record<string, Partial<ProductForm>>` para trackear cambios por producto ID
- Al guardar: iterar sobre `bulkEdits` y ejecutar `supabase.from('products').update(...)` para cada producto modificado
- Invalidar query después de guardar

**Archivo a modificar**: `src/pages/admin/AdminProducts.tsx`

### Detalle técnico

**Auto-slug actualizado:**
```typescript
useEffect(() => {
  if (aiData && slugLocked) {
    const source = showEnglish && aiData.name_en ? aiData.name_en : (aiData.name_es || '');
    setAiData(prev => prev ? { ...prev, slug: slugify(source) } : prev);
  }
}, [aiData?.name_es, aiData?.name_en, showEnglish, slugLocked]);
```

**Bulk edit state:**
```typescript
const [bulkEditMode, setBulkEditMode] = useState(false);
const [bulkEdits, setBulkEdits] = useState<Record<string, any>>({});

const handleBulkSave = async () => {
  const entries = Object.entries(bulkEdits);
  for (const [id, changes] of entries) {
    await supabase.from('products').update(changes).eq('id', id);
  }
  qc.invalidateQueries({ queryKey: ['admin-products'] });
  setBulkEditMode(false);
  setBulkEdits({});
};
```

