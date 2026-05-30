# Plan final: pendientes motion + IOSSheet + checkout-as-print + PWA completa

## 1) IOSSheet (`src/components/mobile/IOSSheet.tsx`)
Wrapper adaptativo: en desktop usa `Dialog` de shadcn; en móvil renderiza un bottom sheet con grabber, drag-to-dismiss (>120px o velocity>500), bordes redondeados arriba, backdrop blur, `safe-area-inset-bottom`. Aplicado a `VariationComparator`, `ShareMenu` y zoom de imagen en `ProductDetail`. Diálogos admin no cambian.

## 2) Scroll-linked print head (`src/components/motion/PrintHeadScroll.tsx`)
Barra fina top con cabezal dorado (punto + glow) que avanza según `useScroll` dejando línea de filamento atrás. Solo en `/catalog`, `/3dmodels/*`, `/checkout`, `/our-process`, `/materials`. Respeta `prefers-reduced-motion`. Montado en `App.tsx`.

## 3) Checkout-as-3D-print
Reemplazo de `StepRail` en `Checkout.tsx` por un visualizador de impresión:
- Header: "Capa N de M · X% impreso" en vez de "Paso N".
- Barra de progreso = filamento dorado extruyéndose (mismo lenguaje que `PrintProgressBar`).
- Cada paso completado se "solidifica" (clip-path desde arriba).
- Iconos: `Printer` / `Cog` / `Package` / `Truck`.
- Sin cambios de lógica.

## 4) PWA completa (instalable + offline + popup ocasional)

### a) Dependencias (ya instaladas)
`vite-plugin-pwa` y `workbox-window` añadidas. Falta cablearlas.

### b) `vite.config.ts`
Agregar `VitePWA({...})`:
- `registerType: "autoUpdate"`, `injectRegister: null` (registro manual con guard).
- `devOptions.enabled: false` (nunca SW en preview).
- Manifest: nombre, iconos 192/512 (`/logo.png`), `display: standalone`, `theme_color #09090F`, `lang: "es"`, `categories`, `id: "/"`.
- Workbox:
  - `navigateFallbackDenylist`: `/~oauth`, `/admin`, `/auth`, `/api`.
  - `NetworkFirst` para HTML (3s timeout) → evita stale shells.
  - `StaleWhileRevalidate` para JS/CSS.
  - `CacheFirst` para imágenes (30d) y fuentes Google (1y).
  - `cleanupOutdatedCaches: true`, `clientsClaim`, `skipWaiting`.

### c) `src/main.tsx`
Registro manual del SW con **guard estricto**:
- Detecta iframe (`window.self !== window.top`) → unregister cualquier SW.
- Detecta hosts de preview (`id-preview--`, `preview--`, `*.lovableproject.com`, `*.lovableproject-dev.com`, localhost) → unregister.
- Solo registra (`registerSW({ immediate: true })`) en producción real (HTTPS, top-level).

### d) `src/vite-env.d.ts`
Añadir `/// <reference types="vite-plugin-pwa/client" />` para tipos del módulo virtual.

### e) Hook `src/hooks/use-install-prompt.ts`
- Escucha `beforeinstallprompt` (Android/Chrome) y `appinstalled`.
- Detecta iOS Safari (UA sin CriOS/FxiOS) y standalone (`display-mode` o `navigator.standalone`).
- Dismiss persistente 14 días en localStorage.
- API: `{ canPrompt, isIOS, installed, shouldShow, promptInstall(), dismiss() }`.

### f) Componente `src/components/InstallPWAPopup.tsx` (popup ocasional, **NO banner permanente**)
- Aparece como toast/card flotante (esquina inferior derecha en desktop; arriba del BottomTabBar en móvil).
- Reglas de aparición:
  - Solo después de **≥2 visitas** (contador en localStorage, una por sesión).
  - Cooldown **3 días** entre apariciones.
  - Delay 8s tras carga para no interrumpir.
  - Oculto en `/admin/*` y `/auth`.
  - Oculto si ya instalado o dismissed en últimos 14 días.
- Botones: "Instalar" → `promptInstall()` nativo en Android/Chrome; en iOS abre `IOSSheet` con instrucciones (Share → Añadir a inicio). "Ahora no" → dismiss 14d.

### g) `src/App.tsx`
Montar `<InstallPWAPopup />` y `<PrintHeadScroll />` junto a los demás providers de motion.

## Archivos

**Nuevos:** `src/components/mobile/IOSSheet.tsx`, `src/components/motion/PrintHeadScroll.tsx`, `src/components/InstallPWAPopup.tsx`, `src/hooks/use-install-prompt.ts`.

**Editados:** `vite.config.ts`, `src/main.tsx`, `src/vite-env.d.ts`, `src/App.tsx`, `src/pages/Checkout.tsx` (StepRail), `src/pages/ProductDetail.tsx` (IOSSheet para comparator/zoom), `src/components/VariationComparator.tsx`, `src/components/ShareMenu.tsx`, `public/manifest.webmanifest` (refinos opcionales — el manifest principal lo genera vite-plugin-pwa).

## Sin página `/install`
Descartada. La conversión vendrá del popup ocasional + manifest nativo del navegador.

## Notas
- PWA con SW solo funciona en el dominio publicado (HTTPS top-level). En el preview de Lovable el SW se desregistra automáticamente.
- Todo respeta `prefers-reduced-motion`.
