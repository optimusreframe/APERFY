# Estado y próximos pasos — APERFY

## Fecha de corte y sincronización

- **Fecha de corte:** 2026-08-07 (America/New_York).
- **Repositorio:** `https://github.com/optimusreframe/APERFY.git`.
- **Rama auditada:** `feat/aperfy-rebrand`.
- **Commit actual:** `063ea38` (`feat: persist incoming orders and notify telegram`).
- **Sincronización de la rama auditada:** sincronizada con `origin/feat/aperfy-rebrand` (0 commits adelante y 0 atrás después de la auditoría).
- **Estado de `main`:** la rama local `main` ahora sigue correctamente `origin/main` del repositorio APERFY y está 65 commits detrás de esa rama remota. No se realizó un fast-forward automático del contenido local.
- **Remotos configurados:** solo queda `origin`, apuntando a `https://github.com/optimusreframe/APERFY.git` para fetch y push.

## Incidente de acoplamiento APERFY / 3dtoprint

- **Fecha de investigación:** 2026-08-09 (America/New_York).
- `a3dtoprint` y APERFY no comparten el remote Git, pero APERFY nació exactamente desde el commit `34652f6` de `a3dtoprint`; la primera divergencia de APERFY fue `991d3fb` (`Rebrand storefront as APERFY`, 2026-08-02 13:51:51 -0400).
- Ambos repositorios siguen apuntando al mismo proyecto Supabase `fyqcbkfzyjgddmqupdfr`, con la misma URL y las mismas tablas `products`, `categories`, `materials` y `product_variations`. La RLS concede escritura a cualquier usuario con rol `admin`, sin frontera por aplicación, dominio o repositorio.
- La eliminación de productos ocurrió en la base compartida, no por sincronización de Git. Lovable Cloud confirmó en `activity_logs` el evento `products_bulk_deleted` del 2026-08-05 a las **01:41:45.597 -0400**, ejecutado por un usuario autenticado con rol `admin`: **107 productos eliminados y 1 archivado**. También consta un `product_deleted` individual a las 01:13:47.427 -0400.
- La consulta administrativa de Lovable Cloud muestra **5 filas actuales**: 4 activas y 1 archivada (`Cozy Knitted Fabric Elephant`). El registro masivo solo conserva el conteo, no los 107 IDs, nombres ni payloads; no existe `products_history`, `deleted_at` ni una copia sombra.
- Lovable Cloud confirmó que `postgres_logs` no conserva registros para la ventana del incidente y que no expone PITR, navegador de backups ni restauración. Solo existe `Cloud → Overview → Advanced settings → Export data`, que exporta el estado actual y no recupera filas eliminadas. El backend del proyecto es **Lovable Cloud integrado**, no un proyecto externo/BYO administrable desde la cuenta Supabase actualmente abierta.
- **No se restauraron datos:** hacerlo en el proyecto actual volvería a mostrar los productos restaurados en APERFY. La restauración requiere separar primero APERFY en un proyecto Supabase independiente y conservar el proyecto actual para `3dtoprint`.
- Se eliminaron referencias runtime heredadas en la PWA y plantillas de correo de APERFY; los logos de email ahora se derivan de `SUPABASE_URL` en runtime. La separación operativa aún no está cerrada: `supabase/config.toml` y el `.env` local siguen apuntando al proyecto compartido hasta provisionar el nuevo proyecto APERFY.

## Actualización de separación — 2026-08-16

- Se creó mediante Lovable Cloud Remix un proyecto independiente para APERFY: editor [APERFY](https://lovable.dev/projects/8c94694b-9aab-4c9d-a2c9-09dcb9cbc77b), proyecto Supabase gjpcbtxieilbljiaxuup. Se creó sin historial y sin copiar filas del proyecto origen; el proyecto origen b590134c-e225-401e-a21c-ffefc36577ac no fue modificado.
- El nuevo backend conserva el esquema de 26 tablas y comenzó con datos vacíos. Se migraron al nuevo backend, conservando UUIDs, 3 categorías, 3 materiales, 5 productos, 3 variaciones y 3 ajustes de APERFY (fondo del sistema y flags AI). product_materials estaba vacío.
- Se copiaron al almacenamiento nuevo los 5 recursos de imagen de catálogo y el fondo configurado, y se actualizaron las URLs de products.images y admin_settings.system_background para que ya no apunten al proyecto antiguo.
- No se migraron activity_logs, background_composition_results, perfiles, roles, pedidos, referidos ni credenciales de Auth: son historial/datos compartidos o requieren una decisión de identidad. Tampoco se copiaron los ajustes de pago porque contienen valores específicos de 3dtoprint ($3dtoprint, 3dtoprint).
- .env local y supabase/config.toml ya apuntan al backend nuevo; la clave no se documenta en este archivo. La configuración remota de producción, usuarios/admin, secrets, funciones y dominio todavía no está aplicada.
- Esta actualización reemplaza la afirmación anterior de que la configuración local seguía en el proyecto compartido; esa afirmación describe únicamente el estado previo a esta separación.

## Smoke tests y validación Luna xhigh — 2026-08-16

- El remix de Lovable terminó correctamente: proyecto APERFY `8c94694b-9aab-4c9d-a2c9-09dcb9cbc77b`, commit remoto `4ab3f3c6101f314f3da3fbb5d0663ac25e07e84d`, backend `gjpcbtxieilbljiaxuup`, estado `completed/ready`, todavía **no publicado**.
- Smoke test local sobre `http://127.0.0.1:8080`: catálogo, detalle, imágenes, búsqueda, carrito, guards de checkout/Auth, formulario de solicitud y validación de acceso cargan sin errores nuevos; 26 rutas fueron barridas, 9 públicas cargaron y 17 protegidas/admin redirigieron a `/auth` sin sesión. Desktop y móvil no mostraron overflow; la vista previa remota no es verificable sin una sesión de Lovable en ese navegador y no equivale a producción.
- Se encontró y corrigió con TDD el fallo del selector de idioma en `src/components/layout/MacAppShell.tsx`: `setLanguage` no estaba desestructurado y producía `ReferenceError`. El test ahora comprueba `es → en` en `src/components/layout/MacAppShell.test.tsx`.
- Validación posterior: `npm test -- --run` **27/27 tests en 19 archivos**, `npm run build` aprobado y `git diff --check` aprobado. `npm run lint` sigue fallando con **399 errores y 27 warnings** de deuda amplia preexistente; no se abordó como parte de esta corrección acotada.
- El backend independiente responde HTTP 200 y expone 4 productos activos, 3 categorías, 3 materiales y 3 variaciones. `profiles`, `user_roles`, `orders` y `order_items` siguen vacíos; por tanto no hay todavía usuario/admin ni flujo de compra autenticado demostrable.
- Luna xhigh confirmó **GO local / NO-GO publicación**. También detectó que CSP y X-Frame-Options están declarados mediante `<meta>` y el navegador no los acepta como headers de seguridad efectivos; su corrección depende de la configuración real del hosting y queda pendiente junto con dominio/DNS.

## Corrección de decisión de infraestructura — 2026-08-16

- El remix de Lovable **no es la fuente de código de APERFY** y queda descartado para continuar el desarrollo: heredó la aplicación de 3dtoprint y no representa el código personalizado del repositorio local.
- La decisión anterior de usar Lovable Cloud para provisionar el backend fue incorrecta: se debió localizar primero la base Supabase propia de APERFY. El backend `gjpcbtxieilbljiaxuup` queda provisional y no debe considerarse el destino definitivo ni eliminarse hasta confirmar dónde están sus datos y si existe dependencia con el proyecto remix.
- La cuenta Supabase actualmente conectada expone únicamente los proyectos inactivos `LRSxOR-System` (`zjmgwsdmbikzhmmuasim`) y `OPTIMUS TECHNICIAN HUB` (`cizuyacqzzhuqdarlwny`); ninguno está identificado como APERFY. Hace falta confirmar el `project ref` correcto o iniciar sesión en la organización Supabase donde se creó la base APERFY.
- La fuente de verdad queda fijada en el repo local `/Users/kong/Projects/APERFY` y en `https://github.com/optimusreframe/APERFY.git`. No se harán más cambios de código mediante Lovable hasta resolver el backend destino.

## Backend oficial APERFY — 2026-08-16

- El destino oficial queda fijado en el proyecto Supabase `xftxyvgplghnelawkhvl` (`https://xftxyvgplghnelawkhvl.supabase.co`), organización `OPTIMUS REFRAME Free`, región `ca-central-1`. No comparte proyecto, URL ni credenciales con `3dtoprint`.
- Se aplicaron las 26 migraciones no vacías del repo en orden, incluyendo catálogo, pedidos, reseñas, descuentos, referidos, Storage, email queue, AI settings y eventos entrantes de WhatsApp/Telegram.
- Se trasladaron al backend oficial 3 categorías, 3 materiales y 4 productos activos, conservando UUIDs. Las 3 variaciones visibles del backend provisional apuntaban a un producto archivado que no era visible con la clave pública; no se inventó un producto para forzarlas. `product_materials` estaba vacío.
- Se trasladaron 4 imágenes de productos y el fondo del sistema a Storage oficial; todas las URLs de `products.images` y `admin_settings.system_background` apuntan a `xftxyvgplghnelawkhvl`, no al backend provisional ni a `3dtoprint`.
- Se desplegaron 10 Edge Functions del repo en `xftxyvgplghnelawkhvl`, incluyendo `notify-telegram-order`, AI, Auth email y transactional email. Los despliegues están activos; faltan los secretos de proveedores para que las funciones externas sean operativas.
- Auth quedó configurado con Site URL `https://aperfy.online` y Redirect URLs para `aperfy.online`, `aperfy.kpwr.dev` y localhost en puerto 8080. El proyecto todavía no tiene usuarios ni un `user_roles` admin.
- Security Advisor quedó en 0 errores y 3 warnings aceptados por los helpers `SECURITY DEFINER` necesarios para roles, reviews y descuentos. Se cerraron los listados públicos de Storage y se añadieron límites de entrada al formulario público de model requests.
- El backend provisional `gjpcbtxieilbljiaxuup` no se elimina todavía: conserva un producto archivado y variaciones que requieren una decisión/credenciales de Auth para recuperar completamente. No es usado por el repo local.

## Comprobado y funcionando

- `git status` confirmó que el código estaba limpio al comenzar la auditoría.
- `.env` estaba trackeado y fue retirado del tracking local sin borrar el archivo de la máquina. Se añadió `.env` y `.env.*` al `.gitignore`, conservando `.env.example`.
- El escaneo de patrones no encontró tokens de service role, bots de Telegram, claves privadas ni claves `sk-*` versionadas. El `.env` local contiene valores `VITE_SUPABASE_*`; no se copiaron al commit.
- `npm test -- --run`: **27 tests aprobados en 19 archivos**.
- `npm run build`: **aprobado** con Vite/PWA.
- `npm run lint`: **no aprobado**: 399 errores y 27 warnings en múltiples áreas del repositorio, principalmente usos explícitos de `any`, comentarios TypeScript y reglas de React. No se corrigió este conjunto amplio durante la auditoría.
- La rama activa tiene upstream y el último commit previamente publicado está en `origin/feat/aperfy-rebrand`.
- El código contiene la migración y la Edge Function `notify-telegram-order`, pero eso demuestra presencia en el repositorio, no despliegue remoto.

## Deploy e infraestructura

- No se pudo confirmar un deploy activo de Vercel: no hay CLI de Vercel instalada, no se encontró configuración local de Vercel y no hay workflows de GitHub Actions.
- Supabase CLI `2.113.0` confirmó 10 Edge Functions activas en `xftxyvgplghnelawkhvl`; el despliegue del código sí está hecho, pero los secretos de runtime siguen pendientes.
- `https://aperfy.kpwr.dev` no responde actualmente porque el nombre no resuelve por DNS. Por tanto, no se puede afirmar que producción esté activa ni que devuelva HTTP 200.
- No se modificaron secrets, variables de entorno remotas ni configuración de infraestructura.

## Pendientes bloqueados por configuración externa

1. **Recuperación histórica de 3dtoprint:** no hay backup/PITR/restauración visible ni IDs en el log masivo; hace falta un backup/exportación histórica o soporte de Lovable. No se envió ninguna solicitud.
2. **Auth/admin:** crear o invitar el usuario administrador elegido y asignarle `user_roles.role = 'admin'`; no se inventó una contraseña ni se envió un correo sin autorización.
3. **Secrets y email:** configurar `LOVABLE_API_KEY`/proveedor AI, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `WHATSAPP_BUSINESS_NUMBER`, proveedor SMTP y el secret Vault/cron de la cola de email.
4. **Vercel/hosting:** confirmar el proyecto de producción, configurar las variables de `.env.example`, publicar el repo APERFY y asociar el dominio.
5. **DNS y cabeceras:** crear/verificar `aperfy.online` y/o `aperfy.kpwr.dev`, HTTPS, CSP y X-Frame-Options como headers reales del hosting.
6. **QA autenticada:** probar subida/edición de productos, Auth, checkout idempotente, pagos, reviews, Telegram y email cuando existan usuario admin y secrets.

## Pendientes de desarrollo abordables sin credenciales externas

1. **Corregir lint:** reducir los 399 errores y 27 warnings reportados por `npm run lint`, priorizando las rutas de checkout, administración y Edge Functions.
2. **Alinear ramas:** corregir el upstream de la rama local `main` para que apunte a `origin/main`, previa decisión sobre la rama principal que se usará para el deploy.
3. **QA de lanzamiento:** añadir pruebas de integración para checkout, idempotencia, estados de Telegram y visibilidad en paneles, usando mocks locales de Supabase/Telegram.
4. **Verificación visual de producción:** ejecutar pruebas browser en desktop y móvil después de disponer de una URL desplegada.

## Próxima recomendación

La separación de datos y el backend oficial ya están configurados. El siguiente paso seguro es resolver Auth/admin, secrets, hosting y DNS; después repetir QA autenticada de subida/edición de productos, uploads, pedidos y pagos antes de publicar. La restauración histórica de 3dtoprint sigue bloqueada por la falta de backup/PITR. El lint y la QA de integración deben continuar después, porque los tests unitarios y el build pasan, pero el lint global revela deuda técnica.

## Recomendación histórica (antes de la separación)

Primero resolvería el acceso a Supabase y Vercel/DNS. Es el camino más corto para confirmar el estado real de producción, aplicar la migración de pedidos entrantes y probar Telegram de extremo a extremo. Después abordaría el lint y la QA de integración, porque ahora los tests unitarios y el build pasan, pero el lint global revela deuda técnica que conviene reducir antes de la migración definitiva de máquina.

## Estado vigente de cierre — 2026-08-16

- La fuente de verdad operativa es el repo local APERFY y el proyecto Supabase oficial `xftxyvgplghnelawkhvl`; el backend provisional de Lovable no se usa y no se importaron productos de 3dtoprint.
- Vercel tiene el proyecto `aperfy`, las variables públicas de Preview/Production y el dominio `aperfy.kpwr.dev`. Namecheap publica el CNAME requerido y Vercel lo verifica correctamente.
- Supabase Auth usa `https://aperfy.kpwr.dev` como Site URL y conserva los redirects de producción y localhost. Todavía falta crear el primer usuario y asignarle `user_roles.role = 'admin'`.
- Las funciones de AI, email, Telegram, WhatsApp y la cola cron están desplegadas. Sus credenciales se introducen desde Admin → Integraciones y se almacenan en Vault; Resend queda pendiente de la cuenta, dominio remitente y API key del propietario.
- `npm run lint` queda en **0 errores y 0 warnings**; `npx tsc -b --pretty false`, `npm test -- --run` (**27/27**) y `npm run build` pasan. El build conserva únicamente el warning informativo del bundle grande.
- El smoke test público y la protección de rutas están verificados. El CRUD autenticado de productos y el checkout end-to-end requieren que el propietario cree el admin, añada un producto propio y configure los secretos; no se alteraron los productos existentes.
