

# 3DtoPrint — Plataforma Premium de Impresión 3D

## Identidad Visual
- **Paleta**: Dark mode (#0A0A0F fondo) + Dorado (#D4AF37 acentos) + Blanco (#F5F5F5 texto)
- **Tipografía**: Inter/Outfit para UI, fuente display bold para headings
- **Estilo**: Futurista-premium con glassmorphism, gradientes sutiles dorados, animaciones suaves de entrada y hover effects 3D (rotaciones CSS, parallax)

## Estructura de Páginas

### 1. Landing Page Principal (`/`)
- Hero section con animación de impresión 3D (CSS/SVG animado), headline bold, CTA "Explorar Modelos"
- Sección de modelos destacados (carousel premium)
- Sección "Cómo funciona" (3 pasos con iconos animados)
- Galería de materiales/filamentos disponibles
- Testimonios/stats
- Footer premium con links y redes sociales

### 2. Tienda de Modelos 3D (`/3dmodels`)
- **Sidebar izquierda**: Filtros (categoría, material, precio, popularidad, disponibilidad)
- **Barra superior**: Búsqueda + ordenar por (precio, recientes, populares)
- **Grid 4 columnas**: Cards premium con imagen, nombre, precio, botón favorito
- **Paginación** o scroll infinito
- Inspirado en MakerWorld

### 3. Página de Producto (modal o `/3dmodels/:id`)
- Galería de imágenes con zoom
- Nombre, descripción completa, materiales disponibles
- Selector de variaciones (color, tamaño, material)
- Selector de cantidad
- Campo de notas/solicitudes especiales del cliente
- Precio dinámico según variaciones
- Botón "Agregar al carrito" + "Guardar a favoritos"
- Productos relacionados

### 4. Catálogo P2P (`/catalog`) — Solo accesible por URL directo (no en menú)
- Mismos productos sincronizados con /3dmodels
- Vista completa de productos (imágenes, descripción, materiales, todo)
- **Sin opción de compra online**
- Botón "Ordenar por WhatsApp" que genera mensaje precargado a wa.me/16893324656
- Detecta idioma del usuario: mensaje en inglés o español según corresponda

### 5. User Panel (`/dashboard`)
- **Perfil**: Foto, nombre, email, teléfono, contraseña, 2FA
- **Favoritos**: Grid de modelos guardados
- **Compras**: Historial de órdenes con estado (pendiente, en impresión, enviado, completado)
- **Soporte**: Formulario de contacto / chat de tickets

### 6. Admin Panel (`/admin`)
- Dashboard con métricas (ventas, usuarios, modelos populares)
- **Gestión de Productos**: CRUD completo estilo Shopify (agregar/editar/eliminar modelos con imágenes, variaciones, precios, materiales, estado activo/inactivo)
- **Gestión de Órdenes**: Ver y actualizar estado de pedidos
- **Gestión de Usuarios**: Ver usuarios registrados
- **Configuración del Sitio**: Editar textos del landing, hero, about, footer, etc.
- **Gestión de Categorías y Materiales**
- Los cambios en productos se sincronizan automáticamente en /3dmodels y /catalog

## Sistema Multi-idioma
- Detección automática del idioma del dispositivo (navigator.language)
- Switch premium en el navbar para cambiar idioma manualmente (ES/EN)
- Activo en TODAS las páginas (landing, tienda, catálogo, user panel, admin panel)
- Sistema i18n con archivos de traducción

## Pagos (Checkout + Manual)
- Carrito de compras con checkout integrado (Stripe)
- Opción alternativa de pago manual/WhatsApp para quien lo prefiera

## Backend (Lovable Cloud)
- Autenticación con email/contraseña + 2FA
- Base de datos: Tablas para productos, variaciones, categorías, materiales, órdenes, favoritos, tickets de soporte, configuración del sitio
- Storage para imágenes de productos y fotos de perfil
- Row-Level Security para proteger datos de usuarios

## Fases de Implementación
1. **Fase 1**: Setup backend, auth, landing page, sistema i18n
2. **Fase 2**: Admin panel con CRUD de productos
3. **Fase 3**: Tienda /3dmodels + página de producto + favoritos
4. **Fase 4**: Catálogo /catalog con WhatsApp
5. **Fase 5**: User panel completo
6. **Fase 6**: Carrito + checkout con Stripe
7. **Fase 7**: Pulido visual, animaciones, responsive

