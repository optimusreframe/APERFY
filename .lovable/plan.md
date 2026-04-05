
Problema verificado:
- Revisé el flujo actual y los logs del backend.
- Do I know what the issue is? Sí.
- La función `ai-product-import` sí está recibiendo la petición, pero en `generate_image` está fallando en backend con `AI did not return an image`.
- En el modal, el preview hace fallback a la imagen fuente (`aiOriginalImage` / `aiSelectedSourceImage`), por eso visualmente parece que “solo trae la imagen original”.
- Además, el auto-disparo tras el scrape usa `setTimeout(() => handleAiGenerateImage(), 100)`, lo que puede lanzar la generación con estado anterior y sin la imagen fuente recién asignada.

Plan de implementación:

1. Backend `supabase/functions/ai-product-import/index.ts`
- Mantener el modelo de imagen actual, pero corregir la lógica de parseo de respuesta.
- Leer la respuesta de Lovable AI de forma defensiva y no asumir un único shape.
- Si no llega imagen, devolver un error estructurado y útil con el motivo real del backend.
- Alinear el input de generación con el flujo esperado: una imagen fuente obligatoria y segunda imagen solo cuando realmente corresponda.
- Añadir logs más claros para diferenciar: respuesta vacía, formato inesperado o texto sin imagen.

2. Frontend `src/pages/admin/AdminProducts.tsx`
- Quitar el auto-trigger basado en `setTimeout` y reemplazarlo por una llamada que use explícitamente la imagen fuente calculada en ese momento.
- Centralizar la prioridad de imagen fuente: foto manual > `reference_image_url` > primera extraída.
- Separar visualmente “imagen fuente” de “imagen generada” para que un fallo no parezca un éxito.
- Mejorar el manejo de `supabase.functions.invoke(...)` para mostrar el mensaje real del backend en lugar del genérico `Edge Function returned a non-2xx status code`.

3. UX del modal
- Mostrar estados claros: generando, éxito y fallo.
- Si no existe `aiGeneratedImage`, no dejar el flujo en un estado ambiguo.
- Mantener el formulario listo para guardado solo cuando haya una imagen AI válida o cuando el admin decida continuar conscientemente.

4. Validación final
- Probar los 3 modos: `system`, `ai/premium`, `custom`.
- Probar ambos orígenes: URL con imágenes extraídas y foto manual subida.
- Confirmar que el resultado final rellena el formulario con nombre corto, descripción corta y la URL nueva de la imagen generada, no la original.

Resultado esperado:
- La imagen original ya no se confundirá con una imagen generada.
- Si la IA genera correctamente, el preview mostrará la nueva imagen y esa será la que pase al formulario.
- Si falla, verás el error real y el flujo no quedará “a medias”.

Archivos a modificar:
- `supabase/functions/ai-product-import/index.ts`
- `src/pages/admin/AdminProducts.tsx`

No hacen falta cambios de base de datos ni autenticación.
