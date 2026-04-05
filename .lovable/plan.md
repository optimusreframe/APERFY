

# Simplificar Navbar — Solo Elementos Esenciales

## Problema
El Navbar tiene un menú de navegación (Home, 3D Models, Request) que es redundante porque todo el contenido ya está en la página principal. Además, el link a `/catalog` no debería ser visible ya que esa página es solo para acceso directo.

## Cambios

### `src/components/Navbar.tsx`
- **Eliminar** completamente `navLinks`, el bloque de Desktop Nav Links (con las pills animadas y los dots separadores), y el bloque equivalente en el menú mobile
- **Mantener** solo: Logo + título, carrito, language switch, y account (avatar/login)
- El navbar queda más limpio y centrado: logo a la izquierda, acciones a la derecha
- En mobile: el botón hamburguesa solo muestra cart, idioma, y opciones de cuenta (o se elimina si no hay suficiente contenido para justificarlo)

### Elementos que se mantienen intactos
- Logo "3DtoPrint"
- Carrito con badge de cantidad
- Selector de idioma (EN/ES)
- Avatar dropdown (admin/user) o botón de login
- Toda la lógica de scroll, glass effect, etc.

### Archivos
1. `src/components/Navbar.tsx` — eliminar nav links desktop y mobile

