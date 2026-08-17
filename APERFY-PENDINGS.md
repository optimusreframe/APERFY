# APERFY — Pendientes de producción

La fuente de verdad es el repositorio local y el proyecto Supabase oficial
`xftxyvgplghnelawkhvl`. No se importan ni modifican productos de 3dtoprint.

## Completado

- [x] Vercel creado para APERFY con variables públicas en Preview y Production.
- [x] `aperfy.kpwr.dev` añadido a Vercel, CNAME creado en Namecheap y HTTPS verificado.
- [x] `VITE_SITE_URL` configurado en Vercel y Supabase Auth.
- [x] Migración de secretos Vault, funciones Edge y cron de email desplegados.
- [x] AI, Resend, Telegram y WhatsApp preparados para configurarse desde Admin → Integraciones.
- [x] CSP, X-Frame-Options y demás headers de seguridad configurados en `vercel.json`.
- [x] ESLint sin errores ni warnings, TypeScript, tests y build de producción aprobados.

## Requiere una acción del propietario

- [ ] Crear la cuenta admin desde `https://aperfy.kpwr.dev/auth` y asignarle el rol `admin`.
- [ ] Abrir una cuenta en Resend, verificar el dominio/remitente y crear una API key del free tier.
- [ ] Introducir en Admin → Integraciones las claves del proveedor AI, Resend, Telegram y WhatsApp.
- [ ] Probar el flujo autenticado de registro, login y recuperación de contraseña.
- [ ] Crear productos propios de APERFY y ejecutar el smoke test de creación, edición, publicación y eliminación.
- [ ] Ejecutar un checkout real de prueba: WhatsApp + notificación Telegram + email.

## Bloqueado externamente

- [ ] Recuperar históricos eliminados de 3dtoprint solo si aparece un backup/PITR/exportación histórica; no se toca APERFY para intentarlo.
