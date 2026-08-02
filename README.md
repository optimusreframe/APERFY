# 3DtoPrint

Crea un website full stack dedicado a impresion 3D donde yo pueda publicar mis modelos 3D, los usuarios puedan verlos y decidir encargar/comprar los modelos. Aqui vendemos impresion 3D, no archivos STL. Debe ser un website premium-avanzado con estilo de tecnologia pero con mucha mencion en estilos/disenos/animaciones 3D. Las impresiones son en filamentos. Necesito que cada producto/modelo que publique pueda tener su imagen, descripcion, materiales, variaciones, costo, ordenar cantidades, agregar notas (solicitudes especiales de los clientes), etc. Debes crear una website principal, un admin panel y un user panel. En la web principal debes hacer una landing pages destacable… Tambien debe haber otra web anclada al menu que dirija a una pagina nueva de 3D MODELS dondel los usuarios puedan ver en forma de grip premium, 4 modelos por fila, una sidebar que ayude a buscar, filtrar modelos, etc. Filtros y barras de busquedas arriba, etc (puedes tomar como referencia la pagina de makerworld https://makerworld.com/en/3d-models ). Cuando un usuario haga clic en un modelo, debe abrirse la ventana del producto y permitir ver las imagenes del producto, descripcion, etc, etc, etc (puedes tomar de referencia el modelo de este producto en makerworld https://makerworld.com/en/models/2556072-project-hail-mary-rocky-s-handmade-xenian-figurine#profileId-2815715 ).  Los productos deben tener opcion de guardar a favoritos y estos se guardaran en una seccion de Favoritos en el user panel. El user panel debera permitir configurar completamente su perfil, foto, nombre, correo, telefono, contrasena, autenticador 2fa. Debe tener  TABS de: PERFIL / FAVORITOS / COMPRAS / SOPORTE. El admin panel debe permitir configurar absolutamente toda la web, teniendo un menu avanzado-premium que este dividido por categorias/secciones, que todo el contenido pueda ser modificado. Los productos deben poder agregarse/eliminarse/modificarse como Shopify….



Debemos hacer otra pagina que solo se pueda acceder unicamente con el URL, dominio.com/catalog

en esta pagina mostraremos los mismos productos sincronizados con los de la tienda de 3D MODELS pero, en esta pagina solo podran ver los modelos, ver descripciones, toda la info del producto pero no podran comprar online, esta pagina es unicamente para fines de presentacion P2P, pero si deberia existir la opcion de si un modelo es del interes de la persona, puede darle clic a un boton de “ORDENAR POR WHATSAPP”. Entonces, usa el link wa.me/16893324656 con un mensaje precargado del modelo del interes del usuario donde mencione

“Hi, I'm interested in this model.        

MODEL,

DESCRIPTION,



URL MODEL.”



Debemos usar dos enlaces, uno para users que usan el idioma ingles y el mensaje debe ser completamente en ingles, y otro enlace para users que usan el idioma espanol y el mensaje debe ser completamente en espanol.





Cuando un admin agrega un modelo en el admin panel, ese modelo debe sincronizarse en las dos paginas /3dmodels y /catalog

Si un producto es modificado, inhabilitado, eliminado, el producto debe sincronizarse en las dos paginas /3dmodels y /catalog



Todo el website debe ser multilanguage en automatico, es decir, el website debe detectar el idioma del dispositivo del usuario para ofrecerle el website en su idioma de su preferencia. Pero tambien agregamos una opcion premium-avanzada en el menu donde los usuarios puedan cambiar el idioma rapidamente con un switch.



Esta opcion multilanguage debe estar activa en todas las paginas del website, incluyendo admin panel, user panel, catalog, y cualquier otra pagina que se cree a futuro. Priorizando siempre el idioma nativo del user device.



Aun no se que nombre ponerle a la website, no estoy decidido, pero quiero que sea algo muy premium, muy relevante, muy 3D, pero tambien relacionado con “KONG”, pero que no sea tan largo, ni tan generico, ni tan basico. Quiero algo premium, pero facil de recordar para que cuando un usuario quiera imprimir algo diga “En XXXX lo puedes conseguir/imprimir/ordenar…”

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://a3dtoprint.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b590134c-e225-401e-a21c-ffefc36577ac).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
