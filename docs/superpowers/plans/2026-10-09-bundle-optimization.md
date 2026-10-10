# Bundle Optimization Implementation Plan

> Estado: implementado y desplegado. Los commits `e1e79d4`, `06d48f2` y `c43c87a` contienen la optimización, el alcance geográfico US/VE y la limpieza final de diagnósticos.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar el chunk JavaScript mayor de 500 kB y reducir el coste de instalación/carga del PWA sin cambiar el comportamiento del catálogo, checkout, dirección, admin ni importación, limitando la geografía soportada a USA y Venezuela.

**Architecture:** Primero se establecerá una línea base reproducible de tamaños, rutas y precache. Después se generará un dataset compacto únicamente para USA y Venezuela, se separarán los parsers de importación para que se descarguen solamente cuando se necesitan, y se ajustará el precache del service worker. Finalmente se verificarán las rutas públicas, checkout, PWA y admin antes de cualquier despliegue.

**Tech Stack:** Vite 5, Rollup, React 18, TypeScript, `vite-plugin-pwa`/Workbox, Vitest, Playwright y `country-state-city`.

## Global Constraints

- No subir el `chunkSizeWarningLimit` como sustituto de la optimización.
- Soportar exclusivamente USA y Venezuela, incluyendo sus estados/provincias y ciudades disponibles en la fuente elegida.
- Rechazar países fuera de USA y Venezuela en el checkout y en cualquier selector de dirección.
- No eliminar estados, ciudades ni autocompletado dentro de USA y Venezuela.
- No modificar el flujo de checkout, órdenes, inventario, autenticación ni funciones Edge salvo que una prueba demuestre una regresión relacionada.
- Mantener el shell público, las rutas admin protegidas y las imágenes funcionales con red y con caché.
- Mantener rollback simple: cada etapa debe ser un commit independiente y desplegable.
- No tocar producción hasta que pasen tests, build, lint y smoke tests de navegador.

## Evidencia actual

El build actual termina correctamente, pero muestra:

```text
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking
- Adjust chunk size limit via build.chunkSizeWarningLimit
```

Los artefactos observados son:

| Artefacto | Tamaño minificado | Gzip | Lectura |
|---|---:|---:|---|
| `state-*.js` | 504.72 kB | 121.70 kB | Datos completos de estados de `country-state-city`; causa directa del warning |
| `AdminInventoryImport-*.js` | 461.41 kB | 152.79 kB | Parser XLSX/ZIP; no supera el umbral, pero es pesado |
| `index-*.js` | 382.98 kB | 121.97 kB | Entrada principal de la aplicación |
| `phone-*.js` | 208.73 kB | 44.28 kB | Validación/formateo telefónico |

Aunque `state-*.js` ya se solicita mediante `import()` cuando se selecciona un país, la configuración PWA actual incluye todos los `.js` en `globPatterns`, por lo que ese chunk también aparece en las 116 entradas precacheadas. El warning no indica un fallo de seguridad ni de funcionalidad, pero sí un coste innecesario de descarga, parseo, memoria y almacenamiento de caché.

### Task 1: Crear una línea base de bundles y rendimiento

**Files:**
- Create: `scripts/report-bundle.mjs`
- Modify: `package.json`
- Test/verification: `dist/`, `npm run build`, Playwright smoke tests existentes

**Interfaces:**
- Consumes: salida de `vite build` y archivos `dist/assets/*`.
- Produces: reporte reproducible con tamaño bruto, gzip, ruta/chunk, total precacheado y lista de chunks sobre los umbrales.

  - [x] **Step 1: Definir los datos mínimos del reporte**

  El script debe leer `dist/assets`, calcular bytes brutos y gzip, ordenar descendente y fallar solamente si no encuentra el directorio de build. No debe bloquear todavía por tamaño; la función inicial es medir.

  - [x] **Step 2: Agregar el comando de reporte**

  Añadir `build:report` a `package.json` para ejecutar el build y el reporte de forma consecutiva, sin cambiar `build` ni el comportamiento de producción.

  - [x] **Step 3: Capturar la línea base**

  Ejecutar:

  ```bash
  npm run build:report
  npm test -- --run
  npm run lint
  ```

  Guardar los valores en el PR/commit de esta etapa para comparar después. No desplegar esta etapa si solo agrega tooling y no cambia runtime.

### Task 2: Limitar y sacar los datos geográficos del bundle JavaScript

**Files:**
- Create: `scripts/generate-location-data.mjs`
- Create: `public/data/location-states/US.json`
- Create: `public/data/location-states/VE.json`
- Create: `public/data/location-cities/US/<state>.json` (archivos generados por estado)
- Create: `public/data/location-cities/VE/<state>.json` (archivos generados por estado)
- Modify: `src/lib/location-data.ts`
- Modify: `src/pages/Checkout.tsx`
- Modify: `vite.config.ts` solamente si hace falta una regla de runtime caching para esos JSON
- Test: `src/lib/address-search.test.ts` y un nuevo test de carga de estados por país si el helper actual lo requiere

**Interfaces:**
- Consumes: `country-state-city/lib/assets/state.json` y `city.json` durante la generación.
- Produces: `getCountryOptions()` limitado a US/VE; `getStatesForCountry(countryCode): Promise<CheckoutRegion[]>`; y `getCitiesForState(countryCode, stateCode): Promise<CheckoutCity[]>`, cargando únicamente los JSON solicitados.

  - [x] **Step 1: Especificar la compatibilidad del formato y el alcance**

  El generador debe conservar `isoCode` y `name`, producir únicamente `US` y `VE`, normalizar códigos de estado/provincia, y rechazar códigos de país distintos de `US` y `VE`. El helper debe devolver `[]` para código vacío o país no permitido y conservar el fallback controlado para estados sin ciudades.

  - [x] **Step 2: Generar los archivos de USA y Venezuela**

  Ejecutar el generador desde una dependencia instalada, producir JSON estático de estados y ciudades para `US` y `VE`, y registrar el resultado de forma determinista. No copiar datos de otros países al repositorio ni al bundle.

  - [x] **Step 3: Cambiar el helper sin alterar el flujo del checkout**

  Sustituir los imports monolíticos por cargas de los recursos de `US`/`VE`. `getCountryOptions` debe devolver solo esos dos países; `CheckoutRegion` mantiene `isoCode`/`name`; el nuevo `CheckoutCity` debe usarse para completar ciudad sin introducir otros países.

  - [x] **Step 4: Añadir caché de datos bajo demanda**

  Si el service worker debe cachear estos recursos, usar reglas específicas `CacheFirst` o `StaleWhileRevalidate` para `/data/location-states/{US,VE}.json` y `/data/location-cities/{US,VE}/*.json`, con expiración larga y sin precachear datos no utilizados. La primera selección online debe funcionar y la selección repetida debe usar caché.

  - [x] **Step 5: Verificar paridad**

  Comparar automáticamente USA y Venezuela contra la salida de la dependencia original. Confirmar que un país no permitido no aparece, que país/estado/ciudad y dirección continúan completándose correctamente, y que no se filtran archivos de otros países.

### Task 3: Diferir los parsers de importación de inventario

**Files:**
- Modify: `src/pages/admin/AdminInventoryImport.tsx`
- Modify: `src/lib/inventory-import/persist.ts`
- Modify: `vite.config.ts` solo si el reporte demuestra un chunk compartido subóptimo
- Test: `src/pages/admin/AdminInventoryImport.test.tsx` y pruebas de `src/lib/inventory-import/*`

**Interfaces:**
- Consumes: `JSZip` y `XLSX` solamente al iniciar el parseo/persistencia de un archivo.
- Produces: misma preview, validación, importación, cancelación e idempotencia de inventario.

  - [x] **Step 1: Cubrir el contrato actual**

  Ejecutar primero las pruebas de ZIP/XLSX existentes y conservar casos de preview, archivo inválido, límites de seguridad y repetición de importación.

  - [x] **Step 2: Mover `JSZip` y `XLSX` a imports dinámicos**

  Cargar cada parser dentro de la acción que realmente lo necesita. El render inicial de `/admin/inventory-import` debe mostrar el formulario sin descargar los parsers.

  - [x] **Step 3: Mantener mensajes y errores**

  Traducir errores de carga o parseo al mismo canal de toast/error actual y no permitir iniciar persistencia si el parser no cargó correctamente.

  - [x] **Step 4: Verificar el flujo completo**

  Confirmar preview, importación de 209 productos, fotos, stock y deduplicación. Medir que el chunk inicial del admin disminuya y que los parsers se descarguen solo al subir el ZIP.

### Task 4: Reducir el precache del PWA sin romper navegación

**Files:**
- Modify: `vite.config.ts`
- Test/verification: `dist/sw.js`, instalación limpia del PWA y navegación offline/online

**Interfaces:**
- Consumes: chunks generados por Vite.
- Produces: service worker que precachea el shell y recursos esenciales, mientras los chunks de rutas y datos bajo demanda se cachean al usarse.

  - [x] **Step 1: Definir el shell esencial**

  Mantener en precache `index.html`, CSS, manifest, iconos, `index-*.js`, vendors necesarios y assets esenciales. Excluir datos geográficos por país y parsers de admin que no necesita un visitante público inicial.

  - [x] **Step 2: Añadir runtime caching específico**

  Asegurar que los scripts lazy y los JSON de estados se recuperen online y queden disponibles en caché después del primer uso. Mantener `NetworkFirst` para navegación y no cachear respuestas de Supabase sensibles como si fueran assets públicos.

  - [x] **Step 3: Verificar instalación y actualización**

  En un perfil limpio, instalar el PWA, abrir catálogo, detalle, carrito, checkout y admin. Verificar que no existan errores de `ChunkLoadError`, que el service worker actualice correctamente y que una versión nueva invalide los hashes anteriores.

### Task 5: Ajustar presupuestos y prevenir regresiones

**Files:**
- Modify: `scripts/report-bundle.mjs`
- Modify: `package.json`
- Modify: `vite.config.ts` solo para límites documentados después de optimizar
- Test: CI/local build verification

**Interfaces:**
- Consumes: reporte de Task 1.
- Produces: presupuesto que alerta sobre regresiones reales, no sobre chunks lazy intencionalmente aislados.

  - [x] **Step 1: Repetir el build y comparar**

  Confirmar que no exista ningún chunk JavaScript minificado mayor de 500 kB, que el precache total baje respecto a los 7.2 MB observados y que el JS inicial no aumente.

  - [x] **Step 2: Añadir límites con tolerancia controlada**

  El reporte debe fallar ante una regresión significativa del shell o ante la reaparición de un chunk mayor de 500 kB. No elevar el warning de Vite para ocultar el problema.

  - [x] **Step 3: Ejecutar la validación final**

  ```bash
  npm run build:report
  npm test -- --run
  npm run lint
  npm run build
  ```

  Además, usar Playwright/CUA para comprobar catálogo de 210 productos, filtros, detalle, carrito con miniatura completa, checkout con dirección y `/admin/inventory-import`.

  - [x] **Step 4: Desplegar gradualmente**

  Crear un deployment preview, ejecutar smoke tests y comparar tiempos/redes con producción. Solo después promover a producción. Mantener el deployment anterior listo para rollback inmediato.

## Criterios de aceptación

- El build ya no emite el warning de chunks mayores de 500 kB.
- El chunk de estados deja de incluir toda la base geográfica en un único archivo JavaScript.
- El PWA no precachea parsers de admin ni todos los datos geográficos de todos los países.
- El checkout solo permite USA y Venezuela, conserva selección de estado/ciudad, autocompletado y validaciones.
- La importación ZIP/XLSX conserva preview, seguridad, fotos, stock e idempotencia.
- Tests, lint, build y smoke tests pasan sin regresiones.
- La optimización es reversible por commits/deployment y no modifica datos existentes.
