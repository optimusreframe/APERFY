

# Background Animado Mejorado + Detalles en Carrito/Checkout

## Parte 1: Background con más velocidad y objetos dinámicos

### Animaciones más rápidas
- Reducir duración de keyframes: `bg-float-1` de 22s→10s, `bg-float-2` de 28s→14s, `bg-float-3` de 20s→9s, `bg-drift` de 30s→12s
- Reducir rango de duración por elemento de `18-43s` a `8-18s`
- Los elementos se desplazarán visiblemente por toda la pantalla

### Nuevos objetos 3D SVG (inline, ligeros)
Agregar ~6 nuevas siluetas temáticas:
- **Benchy** (barco benchmark de impresión 3D)
- **Engranaje** (gear mecánico)
- **Nozzle/Hotend** (boquilla de impresora)
- **Pirámide/Cono** (forma geométrica)
- **Llave/Wrench** (herramienta)
- **Estrella 3D** (low-poly star)

### Objetos dinámicos desde productos publicados
- El componente `PrintingBackground` hará un query ligero a `products` (solo `id`, `name_en`, `category_id`, `images`) de productos activos
- Por cada producto, se genera un "hash visual" que selecciona un objeto SVG del pool de formas disponibles (mapeo determinístico basado en el ID del producto)
- Los productos se mezclan con los elementos estáticos base, aumentando la variedad
- Máximo ~25 elementos totales para mantener rendimiento
- Al publicar un producto nuevo, automáticamente aparecerá un nuevo objeto en el background en la próxima carga

### Archivos
- `src/components/PrintingBackground.tsx` — reescribir con nuevos SVGs, query a productos, animaciones más rápidas
- `tailwind.config.ts` — ajustar duraciones de keyframes

---

## Parte 2: Detalles del producto en Carrito y Checkout

### Ampliar CartItem interface
Agregar campos opcionales a `CartItem` en `CartContext.tsx`:
- `weightGrams?: number`
- `dimensions?: string`

### ProductDetail.tsx — Enviar datos completos al carrito
Al hacer `addToCart`, incluir `weightGrams` y `dimensions` del tamaño seleccionado.

### Cart.tsx — Mostrar detalles completos
Debajo del nombre del producto, mostrar:
- Variaciones seleccionadas (size, color, etc.)
- Peso (ej: `80g`)
- Dimensiones (ej: `25x25x10mm`)
- Precio unitario

### Checkout.tsx — Order Summary mejorado
En el resumen del pedido (paso 1 y paso 2), mostrar para cada item:
- Nombre del producto
- Size seleccionado
- Peso y dimensiones
- Precio unitario × cantidad = subtotal

---

## Archivos a modificar

- `src/components/PrintingBackground.tsx` — nuevos SVGs + query productos + velocidad
- `tailwind.config.ts` — duraciones de animación
- `src/contexts/CartContext.tsx` — campos weightGrams, dimensions
- `src/pages/ProductDetail.tsx` — enviar weight/dimensions al carrito
- `src/pages/Cart.tsx` — mostrar detalles completos del producto
- `src/pages/Checkout.tsx` — mostrar detalles en order summary

