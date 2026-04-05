

# Emails de Autenticación con Diseño Premium 3DtoPrint

## Prerrequisito: Configurar dominio de email

Actualmente no hay dominio de email configurado. El primer paso es configurar el dominio (`3dtoprint.online`) para que los correos se envíen desde tu marca.

**Acción requerida del usuario**: Configurar el dominio de email usando el botón de abajo. Después de eso, procederé con todo lo demás automáticamente.

## Después de configurar el dominio

### 1. Scaffolding de templates de auth email
- Generar los 6 templates de email de autenticación (signup, recovery, magic-link, invite, email-change, reauthentication)

### 2. Diseño premium con identidad 3DtoPrint
Cada template llevará:
- **Logo**: `/logo.png` subido al storage y embebido en cada email
- **Nombre**: "3Dto**Print**" con el "Print" en dorado
- **Colores**: Fondo blanco (`#ffffff` — obligatorio para emails), acentos en gold (`hsl(43, 76%, 53%)` → `#D4A017`), textos en dark (`hsl(240, 10%, 4%)` → `#0A0A0F`)
- **Botones**: Gradiente dorado con texto oscuro, bordes redondeados (0.75rem)
- **Tipografía**: Outfit/Inter con fallback a Arial
- **Estilo 3D**: Sombras en botones y contenedor para efecto de profundidad, bordes sutiles dorados
- **Footer**: "© 2026 3DtoPrint — Premium 3D Printing" con link al sitio

### 3. Templates a personalizar

| Template | Asunto | Mensaje |
|----------|--------|---------|
| Signup | Confirma tu cuenta en 3DtoPrint | Bienvenido al mundo de la impresión 3D premium |
| Recovery | Restablece tu contraseña | Link para crear nueva contraseña |
| Magic Link | Tu enlace de acceso | Accede a tu cuenta con un click |
| Invite | Has sido invitado a 3DtoPrint | Únete a la plataforma |
| Email Change | Confirma tu nuevo email | Verifica tu nueva dirección |
| Reauthentication | Código de verificación | Código OTP para reautenticación |

Todos los mensajes en **español**, acorde al idioma principal de la app.

### 4. Deploy
- Desplegar la edge function `auth-email-hook`

### Archivos a crear/modificar
- `supabase/functions/_shared/email-templates/*.tsx` — 6 templates con diseño premium
- `supabase/functions/auth-email-hook/index.ts` — edge function (scaffolded)
- Subir logo al storage para uso en emails

