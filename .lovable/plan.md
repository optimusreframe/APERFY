

# Loader 3D Premium — "3DP" Logo Assembly

## Concepto

Un loader de 3 segundos a pantalla completa con fondo oscuro donde partículas y objetos 3D geométricos (cubos, esferas, cilindros) flotan y se ensamblan progresivamente para formar las letras "3DP". Incluye un efecto de sonido mecánico/tech. Solo se muestra al cargar/refrescar la página principal (`/`).

## Implementación

### 1. Instalar React Three Fiber

Instalar `three@>=0.133`, `@react-three/fiber@^8.18`, y `@react-three/drei@^9.122.0` (versiones compatibles con React 18).

### 2. Crear componente `SplashLoader3D` (`src/components/SplashLoader3D.tsx`)

**Escena 3D con Canvas de R3F:**
- Fondo negro/oscuro matching la paleta del sitio (`hsl(240 10% 4%)`)
- ~30-40 objetos geométricos pequeños (BoxGeometry, SphereGeometry, CylinderGeometry) con material dorado metálico (`MeshStandardMaterial` con `metalness: 0.8, roughness: 0.2, color: #D4A017`)
- **Fase 1 (0-1.5s)**: Los objetos flotan dispersos por el espacio con rotación aleatoria
- **Fase 2 (1.5-2.5s)**: Los objetos se mueven hacia posiciones predefinidas que forman las letras "3", "D", "P" usando `useFrame` + `lerp` para interpolación suave
- **Fase 3 (2.5-3s)**: Glow final + fade out del loader completo
- Iluminación: `ambientLight` tenue + `pointLight` dorada desde arriba + `spotLight` frontal
- Post-procesamiento ligero: bloom/glow sutil con `drei`'s `Float` para movimiento ambiental

**Sonido:**
- Generar un efecto de sonido corto (~2s) via Web Audio API (AudioContext + OscillatorNode) que simule un sonido mecánico/tech de ensamblaje (sweep frequency ascendente + reverb). No requiere archivos externos ni API keys.

**Lógica de visibilidad:**
- Estado `showLoader` en el componente, inicializado en `true`
- Después de 3 segundos, fade out con CSS transition y luego `display: none`
- Usa `sessionStorage.setItem('3dp-loaded', 'true')` para NO mostrar el loader en navegación interna (solo en refresh/nuevo acceso)

### 3. Integrar en `App.tsx`

- Importar `SplashLoader3D` y renderizarlo condicionalmente solo cuando la ruta es `/` y no hay flag en sessionStorage
- El loader se superpone con `position: fixed, z-index: 9999` sobre todo el contenido
- Al completar la animación, se remueve del DOM

### 4. Posiciones de letras "3DP"

Definir arrays de coordenadas 3D para cada letra usando puntos que formen la silueta de cada carácter. Cada objeto se asigna a una posición target y se interpola hacia ella.

## Archivos

- **Instalar**: `three`, `@react-three/fiber@^8.18`, `@react-three/drei@^9.122.0`
- **Crear**: `src/components/SplashLoader3D.tsx`
- **Editar**: `src/App.tsx` (agregar loader condicional)

