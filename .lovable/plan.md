

# Banner Premium + Background Ultra-Rápido

## 1. HeroBanner Premium Redesign (`src/components/landing/HeroBanner.tsx`)

Reescribir completamente con diseño premium:

**5 banners temáticos:**
1. "Premium 3D Printed Models" — con grid holográfico animado y glow dorado
2. "Can't Find Your Model?" — solicitar modelo personalizado
3. "Fast & Reliable Printing" — velocidad de entrega con Bambulab
4. "Custom Colors & Materials" — variedad de filamentos PLA/PETG/ABS
5. "Join the 3D Community" — registrarse para ofertas exclusivas

**Mejoras visuales:**
- Fondo con mesh gradient animado (CSS `background` con múltiples radial-gradients que se mueven via keyframes)
- Bordes con `border-primary/30` y `shadow-[0_0_30px_rgba(212,160,23,0.15)]` para efecto glow
- Icono más grande (20x20) dentro de un contenedor con `backdrop-blur` y borde dorado brillante
- Texto del título con gradiente dorado via `bg-clip-text text-transparent bg-gradient-to-r from-primary via-gold-light to-primary`
- Partículas decorativas flotantes dentro del banner (3-4 puntos dorados con `animate-pulse`)
- Transición entre banners más cinematográfica: scale + fade + slide
- Progress bar dorada animada debajo de los dots que avanza durante los 6s del timer
- CTA button con hover glow más intenso

## 2. Background Mucho Más Rápido (`PrintingBackground.tsx` + `tailwind.config.ts`)

**Velocidades de animación drásticamente reducidas:**
- `bg-float-1`: 10s → **4s** (movimiento más amplio: ±50px)
- `bg-float-2`: 14s → **5s** (movimiento más amplio: ±40px)
- `bg-float-3`: 9s → **3.5s**
- `bg-drift`: 12s → **5s** (drift más amplio: ±40px en X, ±35px en Y)

**Duración por elemento:** de `8-18s` → **3-7s**

**Keyframes más amplios** para que el movimiento sea realmente visible y cubra más pantalla.

## 3. Archivos

- **Reescribir**: `src/components/landing/HeroBanner.tsx`
- **Editar**: `tailwind.config.ts` (velocidades de keyframes)
- **Editar**: `src/components/PrintingBackground.tsx` (duraciones por elemento)

