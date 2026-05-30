# Dock flotante "Agregar al carrito" — siempre visible, premium Amazon-style

## Problema
El dock actual sólo aparece después de scrollear 320px y, al llegar al final de la página, se ve "pegado" cerca del footer (porque tiene `bottom: safe-area + 76px`, pero a esa altura ya está sobre el footer mientras el viewport llega al fondo). El usuario quiere un dock **siempre visible** sobre el viewport actual, sin importar dónde scrollee, replicando (y mejorando) lo que hace Amazon en sus PDPs móviles.

## Cambios en `src/components/mobile/MobileStickyAddToCart.tsx`

### 1) Visibilidad permanente
- Eliminar el listener de scroll (`y > 320`) y el `IntersectionObserver` que lo ocultaba al ver el CTA inline.
- El dock se monta **siempre** en mobile (`md:hidden`) mientras estemos en la página de producto.
- Animación de entrada: fade + slide-up una sola vez al montar (200ms ease-out).
- Quitar el prop `inlineCtaRef` (ya no se usa). En `ProductDetail.tsx`, eliminar la ref y el paso del prop.

### 2) Coexistencia con CTA inline (sin duplicar acción)
- El CTA grande inline del producto se mantiene como botón secundario visual ("Agregar al carrito" full-width dentro de la card).
- El dock flotante queda como acción primaria persistente — ambos llaman al mismo `addToCart`. No se ocultan entre sí.

### 3) Estilo Amazon mejorado (premium dark/gold)
Reorganizar el layout del dock en dos filas compactas dentro de un card con glassmorphism más fuerte:

```
┌──────────────────────────────────────────────┐
│ [img] World Cup 26 · 3 cm    EN STOCK · 3-7d │  ← fila info
│       $3.00  →  $9.00 (×3)                   │
├──────────────────────────────────────────────┤
│  [− 01 +]   [  🛒 Agregar al carrito  →  ]   │  ← fila acción
└──────────────────────────────────────────────┘
```

- Card: `rounded-2xl`, `bg-background/85`, `backdrop-blur-2xl`, doble borde sutil (`border-primary/25` + ring interno blanco/5), sombra gold ampliada.
- Mini preview: 44×44, conserva el flip 3D en tap.
- Info: nombre + variante en una línea con `truncate`; segunda línea con badge "EN STOCK · 3-7 días" en mono small (reutiliza datos del producto si están disponibles, fallback simple).
- Precio: unitario tachado/pequeño + total grande con `text-gradient-gold`, con cross-fade al cambiar.
- Stepper: redondeado, ligeramente más grande para tap-target ≥44px.
- CTA principal: ocupa el resto de la fila acción, full-width, gradient gold, icono carrito + texto + flecha que se desplaza en `whileTap`. Mantiene haptic y fly-to-cart.
- Estado `needsVariation`: el CTA muestra "Selecciona variante" en lugar del precio/acción y aplica shake al toque.
- Estado `out-of-stock`: CTA deshabilitado con texto "Agotado".

### 4) Posicionamiento
- `position: fixed`, `left-2 right-2`, `z-50`.
- `bottom: calc(env(safe-area-inset-bottom, 0px) + 72px)` para quedar sobre el `BottomTabBar` (que mide ~64–72px).
- En vistas donde no hay BottomTabBar (no aplica aquí, pero por robustez): usar `bottom: calc(env(safe-area-inset-bottom, 0px) + 12px)` si `BottomTabBar` no monta — vamos a leerlo vía variable CSS `--mobile-tabbar-h` opcional; si no existe, fallback 72px.

### 5) Limpieza
- En `ProductDetail.tsx`: remover el `inlineCtaRef` y todo lo relacionado con el observer del CTA inline. Verificar que no quede ningún elemento `sticky/fixed` extra en el footer del producto (revisar la sección "Add to cart" del producto y la zona inferior antes del Footer global) y eliminarlo si existe.

## Constraints
- Sólo cambios de UI/presentación. No tocar `CartContext`, lógica de variantes ni el flujo de cantidad.
- Mantener i18n ES/EN existente.
- Mobile-first (`md:hidden`). No afecta a desktop.
- Conservar tokens semánticos del design system (primary, card, muted-foreground, gradient-gold, shadow-gold).
