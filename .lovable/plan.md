# Plan: Mobile UX premium upgrade (3 zonas)

## 1) Botón flotante "Agregar al carrito" en mobile (ProductDetail)

**Problema actual:** En mobile el CTA de agregar al carrito está al final del scroll. Hay además algo fijo en el footer que no debería estar ahí.

**Propuesta premium estilo Apple, optimizada para 3D:**

Crear un nuevo componente `MobileStickyAddToCart.tsx` que aparezca **solo en mobile** (`md:hidden`) y **solo en `/3dmodels/:slug`**.

Comportamiento:
- Aparece como **dock flotante inferior** (no pegado a footer) con `position: fixed`, separado del borde con `bottom: calc(env(safe-area-inset-bottom) + 88px)` para no chocar con el BottomTabBar.
- Glassmorphism: `backdrop-blur-2xl`, fondo `bg-background/70`, borde sutil `border-primary/20`, `rounded-2xl`, `shadow-gold`.
- Aparece con `motion.div` slide-up + fade cuando el usuario **scrollea más allá del bloque hero del producto** (IntersectionObserver sobre el botón "Add to cart" original). Si está visible el botón original → se oculta el dock.
- Layout en 3 zonas dentro del dock:
  1. **Mini preview** (40×40): imagen de la variante seleccionada con micro-rotación 3D al tap (Framer Motion `whileTap={{ rotateY: 180 }}`).
  2. **Info compacta**: nombre de variante (truncate) + precio en gold gradient (actualiza en vivo al cambiar variante/cantidad).
  3. **Stepper + CTA**: quantity stepper (− 1 +) compacto + botón "Add" con icono cart, haptic feedback (`navigator.vibrate(10)`).
- Animación premium: cuando se agrega, el botón hace un "fly-to-cart" — el preview se anima hacia el icono del carrito en la BottomTabBar (medición con `getBoundingClientRect`), después dock pulse + toast.
- Estados: si no hay variante seleccionada y el producto las tiene → CTA deshabilitado con texto "Selecciona variante" y un sutil shake al intentar agregar.

**Limpieza:** Identificar y remover el CTA fijo que actualmente está en el footer mobile (revisar ProductDetail.tsx, posiblemente envuelto en clases sticky/fixed que no corresponden).

## 2) Página Ask 3D (`/request-model`) — rediseño Apple/Palantir

Rediseño completo de `src/pages/RequestModel.tsx` manteniendo lógica y validaciones existentes (zod schema, sanitize, validateFileUpload, submit a Supabase).

Cambios visuales:
- **Hero header**: título grande tipo Apple (`text-5xl/6xl font-display tracking-tight`), kicker en gold uppercase tracking-widest "REQUEST · CUSTOM · 3D", subtítulo en muted. Un solo glow gold detrás.
- **Form layout**: card central max-w-2xl, fondo `bg-card/40` backdrop-blur-2xl, borde `border-primary/15`, rounded-3xl, padding generoso (`p-8 md:p-12`).
- **Multi-step segmentado tipo Palantir** (sin cambiar el submit final): 3 secciones visibles con stepper superior numerado (01 · Contacto, 02 · Modelo, 03 · Referencias). Stepper con líneas finas, dot gold cuando activo.
- **Inputs estilo Apple**: floating labels, borde inferior animado en gold al focus, `bg-transparent`, transición suave. Reemplazar `<Input>` shadcn por wrappers locales que conserven a11y.
- **Dropzone de imágenes premium**: zona grande con grid de previews 3:4, hover lift, scale-on-drag, contador "X de 5", botón ✕ con animación scale-out. Borde dashed con gradient mask animado cuando dragOver.
- **Botón submit**: full-width, gradient gold→amber, micro-icono "Send" con translate-x on hover, shimmer loop sutil.
- **Estado de éxito**: animación de checkmark drawn-on-path (SVG stroke-dasharray) + mensaje "Recibido", luego CTA secundario "Enviar otro".
- Respeta i18n existente (`t(...)`) — solo cambia presentación.

## 3) SplashLoader3D — centrado y nivel premium Apple/Palantir

**Bug actual:** El texto se ve desplazado a la izquierda en mobile. Causa: en `buildTargets` modo mobile/tablet, los offsets `x1 = -2.5 * scale` y `x2 = -2.8 * scale` están calculados manualmente y no se centran porque la anchura real de cada palabra (n_letras × spacing) no se mide.

**Fix de centrado:**
- Reescribir `buildTargets` para calcular el ancho exacto de cada línea: `lineWidth = (letters.length - 1) * spacing + sum(wordGaps)`, y arrancar en `x = -lineWidth / 2`.
- Aplicar a las 3 modalidades (desktop una línea, tablet/mobile dos líneas).
- Resultado: "3D to" y "Print" perfectamente centrados horizontalmente respecto al canvas.

**Upgrade visual premium (impresión 3D brutal):**
- **Print-head animado**: añadir un `<group>` que representa un cabezal de impresora 3D (cono invertido + cubo) que se desliza horizontalmente sobre cada letra durante phase 1→2, dejando "extruir" las partículas hacia su posición target (sincronizado con la posición Y de cada fila de letras).
- **Build plate**: plano gold semitransparente debajo del texto con grid pattern (shader o líneas), aparece en phase 0 y desciende fuera del frame en phase 3 (efecto de "modelo terminado, retirando pieza").
- **Layer lines**: las partículas, al asentarse, se "imprimen" línea por línea de abajo hacia arriba — staggered delay basado en `target.y`, no random.
- **Progreso textual Palantir**: bajo el texto añadir línea mono `0.05em` tracking: `LAYER 042 / 100 · 1.2s` que avanza con phase, en `font-mono` color `primary/50`. Centrado.
- **Texto secundario**: cambiar "3D Printing" actual por bloque centrado con kicker `INITIALIZING` + barra de progreso fina (1px) gold que se llena en 2.6s, todo `text-center` con `mx-auto`.
- **Motion Framer overlay**: usar `framer-motion` para el contenedor HTML del texto inferior (fade + slide-up staggered de kicker → barra → label).
- Mantener duración total (~3.2s) y la transición de fade-out actual.

## Detalles técnicos

**Archivos a crear:**
- `src/components/mobile/MobileStickyAddToCart.tsx`

**Archivos a modificar:**
- `src/pages/ProductDetail.tsx` — montar `<MobileStickyAddToCart>`, remover CTA fijo del footer, exponer ref del botón "Add to cart" original para IntersectionObserver.
- `src/pages/RequestModel.tsx` — rediseño completo de presentación, conservar handlers/validaciones/submit.
- `src/components/SplashLoader3D.tsx` — fix centrado en `buildTargets`, añadir print-head + build plate + layer-line stagger + nuevo HUD inferior con Framer Motion.

**Constraints:**
- Solo cambios de UI/presentación (sin tocar lógica de carrito, ni submit del form, ni backend).
- Todo con tokens semánticos (`primary`, `card`, `muted-foreground`, `--shadow-gold`, etc.).
- Respeta i18n ES/EN existente.
- Respeta safe-area-inset y el BottomTabBar (88px de offset).
- Mobile-first; el sticky CTA es `md:hidden`.

**No incluido (fuera de scope):**
- Cambios en CartContext o lógica de variantes.
- Cambios en el flujo de submit de RequestModel.
- Cambios en BottomTabBar o Navbar.
