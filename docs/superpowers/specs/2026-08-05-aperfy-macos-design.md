# APERFY macOS — Diseño visual y motion

## Objetivo

Pulir todas las rutas públicas, de cuenta y administrativas para que APERFY se sienta como una aplicación nativa de macOS/iOS: oscura, tecnológica, clara y premium, sin sacrificar la conversión del ecommerce.

## Dirección aprobada

La experiencia combinará tres capas:

- **Base Apple refinada:** glass, blur, superficies oscuras, bordes finos, tipografía limpia y transiciones rápidas.
- **Motion futurista selectivo:** parallax ligero, layout transitions y profundidad únicamente en Home, productos y estados destacados.
- **Cursor glow APERFY:** iluminación verde sutil que sigue el cursor en desktop, desactivada en touch y reducida con `prefers-reduced-motion`.

## Sistema transversal

`MacAppShell` será la estructura común de la experiencia. La ventana seguirá estática; solo el viewport interno hará scroll. Todas las rutas conservarán:

- marco macOS APERFY;
- encabezado y navegación consistentes;
- superficies glass con contraste accesible;
- foco visible y targets táctiles mínimos de 44px;
- footer mínimo con copyright;
- motion que no oculte contenido ni bloquee acciones.

## Motion

- `PageTransition` para entradas/salidas de rutas en 180–320ms.
- `Framer Motion` para entradas, layout transitions y estados de carrito/checkout.
- CSS para hover/focus de 120–220ms.
- `PointerGlow` reutilizado como una sola capa global, con intensidad limitada y `pointer-events: none`.
- Sin tilt 3D permanente, partículas ni distorsiones pesadas en el flujo de compra.
- `prefers-reduced-motion` reducirá transiciones a fades mínimos y desactivará parallax/cursor glow.

## Aplicación por superficie

- **Home:** catálogo principal, banners y filtros con reveal suave, hover tecnológico y cursor glow.
- **Producto:** galería, precio, variantes y CTA con profundidad moderada y layout transitions.
- **Carrito/checkout:** claridad primero; animaciones de confirmación y cambios de cantidad discretos.
- **Perfil:** panel tipo Settings de macOS, navegación segmentada y tarjetas compactas.
- **Admin:** ventana fija, sidebar interna, toolbar consistente y tablas con estados animados sin ruido.
- **Contacto/ask/auth:** formularios nativos, feedback claro y movimiento reducido.
- **Dialogs/popups:** mismo sistema de ventana, overlay glass, foco atrapado y cierre accesible.

## Reutilización y alcance

Se reutilizarán `MacAppShell`, `PageTransition`, `PointerGlow`, tokens existentes y componentes UI instalados. No se añadirá una librería nueva de animación ni se crearán variantes de componentes sin un consumidor real.

## Validación

- tests unitarios y de componentes existentes;
- build de producción;
- auditoría visual en Home, producto, checkout, perfil, ask y todas las rutas admin;
- desktop y móvil;
- contraste y navegación por teclado;
- verificación de `prefers-reduced-motion`;
- `git diff --check` y revisión de bundle.

## Criterio de aceptación

APERFY se percibe como una única app macOS en todas sus rutas, el cursor glow mejora la sensación tecnológica sin interferir con la compra, el contenido sigue siendo legible y el scroll nunca deforma la ventana exterior.
