

# Importación Bulk en Segundo Plano con Banner y Notificaciones

## Problema actual
El proceso bulk import se ejecuta dentro del diálogo modal de AI Import Studio, bloqueando toda la interfaz. El usuario no puede hacer nada mientras espera. Si cierra el diálogo, pierde el progreso.

## Solución

Mover el estado y la lógica del bulk import a un **contexto global** que persiste fuera del diálogo. Al iniciar la importación, cerrar el diálogo automáticamente y mostrar un **banner flotante** con progreso en tiempo real. Al completar, mostrar una **notificación** con informe de resultados.

### Arquitectura

**Nuevo archivo: `src/contexts/BulkImportContext.tsx`**
- Context provider con estado: `items[]` (url, status, name, error), `isRunning`, `isComplete`, `report`
- Función `startBulkImport(urls, categories, systemBgSetting)` que ejecuta el loop actual de `handleBulkImport` pero dentro del contexto
- Función `dismissReport()` para cerrar el banner de resultados
- Usa `useRef` para mantener la referencia al proceso activo sin depender del ciclo de render
- Incluye la lógica de `persistAiImage` copiada del componente actual

**Nuevo archivo: `src/components/BulkImportBanner.tsx`**
- Banner flotante `fixed bottom-4 right-4 z-50` con glassmorphism
- Muestra: barra de progreso, conteo "3/10 completados", nombre del producto actual
- Minimizable (colapsar a solo la barra de progreso)
- Al completar: cambia a banner de resultados con resumen (X creados, Y errores)
- Botón "Ver Informe" que abre un panel con detalle de cada URL: nombre, estado, error si aplica
- Botón "Cerrar" para descartar
- Usa `Notification API` del navegador para notificación nativa al completar (si el usuario otorgó permiso)

### Cambios en `AdminProducts.tsx`
- Eliminar estado local de bulk (`bulkProcessing`, `bulkResults`) y la función `handleBulkImport`
- Importar `useBulkImport()` del nuevo contexto
- Al presionar "Importar Lote con AI": llamar `startBulkImport(urls, categories, systemBgSetting)`, cerrar el diálogo con `setAiOpen(false)`
- Ya no renderizar las secciones de "bulk processing" y "bulk results" dentro del diálogo

### Cambios en `App.tsx`
- Envolver la app con `<BulkImportProvider>`
- Agregar `<BulkImportBanner />` al layout global

### Flujo UX
1. Usuario pega URLs en el tab Bulk → presiona "Importar Lote con AI"
2. El diálogo se cierra inmediatamente
3. Aparece banner flotante en esquina inferior derecha: "Importando 1/10..."
4. Usuario puede navegar libremente por el admin
5. Al completar: banner cambia a informe verde/rojo, notificación del navegador
6. El informe muestra cada URL con estado (creado/error) y mensaje de error si aplica
7. Botón "Cerrar" descarta el banner

### Archivos a crear/modificar
- **Crear**: `src/contexts/BulkImportContext.tsx`
- **Crear**: `src/components/BulkImportBanner.tsx`
- **Modificar**: `src/pages/admin/AdminProducts.tsx` — eliminar lógica bulk local, usar contexto
- **Modificar**: `src/App.tsx` — agregar provider y banner

