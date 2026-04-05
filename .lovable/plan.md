
Objetivo: corregir el bug donde la imagen generada con AI se ve en el review, pero se pierde al pasar al modal final de “Agregar Producto”, dejando el producto sin imágenes.

1. Problema exacto
- En `src/pages/admin/AdminProducts.tsx`, `handleAiSaveProduct()` intenta descargar `aiGeneratedImage` recién cuando el usuario pulsa “Crear Producto”.
- Esa imagen AI puede venir como URL temporal/expirable. Si el `fetch(aiGeneratedImage)` falla, el código entra en `catch` y hace `setMediaFiles([])`.
- Resultado: el segundo modal abre con la data textual, pero sin media.
- El import bulk tiene el mismo riesgo porque también descarga la imagen AI más tarde y la sube después.

2. Solución
- Persistir la imagen AI inmediatamente después de generarla, no al final del flujo.
- En `triggerAiGenerateImage()`:
  - tomar el `generated_image`,
  - convertirlo en `Blob/File` en ese mismo momento,
  - subirlo a `product-images` con una ruta temporal tipo `ai-import-temp/...`,
  - guardar su URL pública permanente en un nuevo estado.
- El preview del review debe usar esa URL persistida, no depender de la URL temporal original.

3. Refactor del flujo
- Agregar estados dedicados, por ejemplo:
  - `aiStoredImageUrl`
  - `aiStoredImagePath`
  - `aiPersistingImage`
- Crear helpers en el mismo archivo:
  - normalizar imagen AI (`data:image/...` o URL remota),
  - convertir a `Blob/File`,
  - subir a storage,
  - borrar temporal anterior al regenerar/cancelar (best effort).
- Cambiar `handleAiSaveProduct()` para que:
  - deje de hacer `fetch(aiGeneratedImage)`,
  - simplemente copie la imagen ya persistida a `mediaFiles` como `isExisting: true`,
  - abra el modal final con media durable ya lista.

4. Ajustes UX
- Deshabilitar “Crear Producto” mientras la imagen AI todavía se está persistiendo.
- Si la persistencia falla, mostrar error explícito y no continuar silenciosamente con un producto sin imagen.
- Si el usuario regenera imagen, reemplazar la referencia persistida anterior por la nueva.

5. Bulk Import
- Reutilizar la misma lógica de persistencia inmediata en `handleBulkImport()`.
- Así cada producto del lote guarda una URL permanente antes de completar el alta, evitando productos creados sin imagen por expiración del asset AI.

6. Archivos a tocar
- `src/pages/admin/AdminProducts.tsx` — fix principal.
- No hace falta migración de base de datos.
- No hace falta cambiar la estructura del producto.

7. Detalle técnico
- El `save` actual ya soporta imágenes “existentes” (`isExisting`) y las conserva en `products.images`, así que la solución encaja con el patrón actual.
- La clave es que el modal final ya no dependa de una descarga tardía desde `aiGeneratedImage`, sino de una URL permanente preparada antes.

8. Validación
- Caso 1: generar imagen, esperar un rato en review, pasar al modal final y confirmar que la miniatura siga presente.
- Caso 2: guardar el producto y verificar imagen en admin y catálogo público.
- Caso 3: regenerar imagen y confirmar que solo se conserva la última.
- Caso 4: probar 2-3 URLs en bulk y verificar que todos los productos creados mantengan su imagen.
