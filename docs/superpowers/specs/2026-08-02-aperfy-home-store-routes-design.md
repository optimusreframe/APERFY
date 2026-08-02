# APERFY Home Store and Route Simplification

## Objetivo

Convertir la home de APERFY en la única tienda/catálogo visible para el cliente. La experiencia debe abrir directamente con promociones, filtros y productos, manteniendo el shell macOS glass, la identidad graphite + verde y el flujo existente de producto, checkout y WhatsApp.

## Arquitectura de rutas

Rutas públicas principales:

- `/`: storefront completo y único catálogo.
- `/products/:slug` y `/3dmodels/:slug`: detalle de producto, manteniendo compatibilidad con enlaces existentes.
- `/checkout`: checkout protegido y coordinación de pedido por WhatsApp.
- `/contact`: contacto general.
- `/ask`: solicitud de un producto no publicado; el usuario describe lo que busca y deja sus datos para recibir aviso si APERFY consigue una oferta y decide publicarla.

Rutas operativas:

- `/admin` y sus subrutas se conservan para gestión interna.

Rutas retiradas de navegación pública:

- `/catalog` deja de existir como pantalla independiente y redirige a `/`.
- `/our-process`, `/materials`, `/request-product` y `/request-model` redirigen a `/` o `/ask` según intención.
- Páginas auxiliares de cuenta, pedidos y favoritos se conservan únicamente si el flujo actual las necesita para autenticación/checkout, pero no se presentan como navegación principal del storefront.

## Experiencia de la home

La home deja de usar un hero editorial separado. Su estructura será:

1. Banner promocional compacto con mensaje de ahorro y disponibilidad limitada.
2. Barra de búsqueda y filtros por categoría, precio y disponibilidad.
3. Grid principal de productos activos.
4. Estados de carga, error y catálogo vacío con el mismo lenguaje visual macOS.
5. Acceso visible a `/ask` para solicitudes específicas.

Copy principal recomendado:

- ES: “Grandes ofertas a precios que sorprenden”.
- ES: “Descubre productos de muchas categorías, conseguidos en oportunidades de volumen y publicados por debajo del precio habitual del fabricante. Stock real, disponibilidad limitada y nuevas ofertas cuando aparecen.”
- EN equivalente: “Great deals at prices that surprise” y una explicación equivalente de variedad, oportunidades de volumen, precio inferior al fabricante y stock real.

El lenguaje no debe prometer stock permanente ni explicar procesos de abastecimiento como una sección editorial. La confianza se comunica con precio, disponibilidad real, detalles claros y un checkout directo.

## Navegación

El sidebar macOS debe priorizar:

- Inicio / tienda.
- Solicitar un producto (`/ask`).
- Carrito.
- Cuenta solo cuando sea necesario.

Se elimina cualquier referencia visible a “Catálogo” como página separada y a “Cómo funciona”. El footer conserva solo enlaces útiles: tienda, solicitar producto, contacto, cuenta y legales si existen.

## Compatibilidad y datos

La consulta de productos existente se mantiene como fuente del storefront. Los filtros se aplican sobre los productos activos ya cargados. El detalle de producto, carrito, checkout y envío a WhatsApp no se rediseñan funcionalmente; solo se ajustan enlaces que aún apunten a `/catalog`.

## Validación

- Home muestra productos y filtros sin hero editorial dominante.
- `/catalog` no renderiza una segunda tienda.
- `/ask` sigue accesible y conserva su formulario.
- Todos los enlaces públicos principales apuntan a `/`, producto, `/checkout`, `/ask` o `/contact`.
- Rutas de producto, checkout, admin y WhatsApp siguen funcionando.
- Tests, build y navegación en browser pasan dentro de la shell macOS fija.
