# Informe Task 1: línea base de bundles

Fecha: 2026-10-09

Estado: COMPLETADO. La línea base quedó registrada y el plan completo se implementó posteriormente.

## Cambios

- `scripts/report-bundle.mjs` recorre recursivamente `dist/assets`, calcula tamaño bruto y gzip, ordena por bytes descendentes y señala chunks JavaScript mayores de 500,000 bytes. El umbral solo informa; no causa fallo.
- El reporte calcula bytes de precache desde las URLs del manifest de Workbox en `dist/sw.js`.
- `package.json` agrega `build:report`, que ejecuta `npm run build` y luego el reporte. El comando `build` existente queda igual.
- `scripts/report-bundle.test.mjs` cubre orden, tamaños brutos/gzip, marcador de umbral, suma de precache y error cuando falta el directorio de build.

## Línea base

Generada con `npm run build:report` el 2026-10-09:

- Assets analizados: 109.
- Precaché: 7,399,928 bytes (7,226.49 KiB), 116 archivos.
- Chunks por encima de 500,000 bytes: `assets/state-BH20HdUC.js`.

| Asset | Bruto | Gzip |
|---|---:|---:|
| `assets/state-BH20HdUC.js` | 505,857 bytes (493.997 KiB) | 121,700 bytes (118.848 KiB) |
| `assets/AdminInventoryImport-C1UrJah2.js` | 461,899 bytes (451.073 KiB) | 152,789 bytes (149.208 KiB) |
| `assets/index-B28ANDAP.js` | 383,123 bytes (374.144 KiB) | 121,971 bytes (119.112 KiB) |
| `assets/vendor-react-DBgFblK_.js` | 259,844 bytes (253.754 KiB) | 89,963 bytes (87.854 KiB) |
| `assets/phone-Byg4aV3B.js` | 209,884 bytes (204.965 KiB) | 44,284 bytes (43.246 KiB) |

## Verificación

- TDD: `node --test scripts/report-bundle.test.mjs` falló primero por la importación faltante del módulo; tras implementar, pasó: 2/2.
- `npm run build:report`: pasó. Vite mostró el warning informativo existente del chunk grande; el reporte terminó correctamente.
- `npm test -- --run`: pasó, 48 archivos y 113 tests.
- `npm run lint`: exit code 0; 0 errores y 3 warnings `react-refresh/only-export-components` en `src/pages/admin/AdminInventoryImport.tsx` líneas 23, 27 y 38.
- No existe una carpeta `tests/` ni smoke test Playwright en el checkout; `playwright.config.ts` apunta a `./tests`, por lo que no había una prueba Playwright existente que ejecutar.

## Preocupaciones

- El reporte depende del formato actual del manifest de Workbox (`url:"...",revision:`) en `dist/sw.js`; si cambia ese formato, el total precacheado aparecerá como 0 hasta actualizar el parser.
- El reporte mide tamaños de archivos en disco; gzip se calcula con Node.js y puede variar ligeramente si cambia la versión de zlib.
- No se modificó runtime ni configuración de producción.
