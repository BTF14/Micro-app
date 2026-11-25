# Manual de usuario de Micro app

¡Bienvenido! Este manual te acompaña paso a paso para que puedas trabajar con tranquilidad. Micro app reúne la consulta de productos, existencias, caja, ventas y reportes de tu negocio. Los botones y pantallas que ves pueden variar según los permisos que te haya asignado el administrador.

## 1. Cómo entrar

1. Abre el enlace de Micro app que te compartió tu negocio.
2. Pulsa **Continuar con Google**.
3. Elige la cuenta de Google que el administrador autorizó para ti. No necesitas crear ni recordar una contraseña nueva.
4. Cuando la cuenta esté autorizada, entrarás al espacio de trabajo de tu negocio. Para salir, usa **Cerrar sesión**.

**¿Aparece un aviso de acceso no autorizado?** No significa que debas registrarte de nuevo. Comprueba que elegiste el correo correcto y, si el aviso continúa, pulsa **Escríbele por WhatsApp** o el enlace de WhatsApp que aparece en pantalla. Solicita al administrador que revise y autorice tu correo. Por seguridad, no compartas contraseñas ni códigos de acceso por chat.

## 2. Los cuatro roles

Cada persona recibe un nivel de acceso según su responsabilidad:

- **Dueño (owner):** responsable principal del negocio. Puede consultar todas las pantallas y administrar la estructura, los permisos y las opciones de gestión cambiaria.
- **Administrador (admin):** ayuda a organizar el trabajo diario, gestionar productos, inventario, caja, ventas y reportes. No sustituye las decisiones reservadas al dueño.
- **Inventario (inventory):** se concentra en existencias, recepción de mercancía, conteos y consulta de precios y reportes de inventario.
- **Cajero (cashier):** trabaja con la caja, registra ventas y consulta la información de sus operaciones y cierres.

### Qué puede hacer cada rol en cada pantalla

| Pantalla | Dueño | Administrador | Inventario | Cajero |
|---|---|---|---|---|
| Resumen | Consultar | Consultar | Consultar | Consultar |
| Productos | Consultar, crear y editar | Consultar, crear y editar | Consultar | Consultar |
| Inventario | Consultar y operar | Consultar y operar | Consultar y operar | Consultar |
| Consultar precio | Consultar | Consultar | Consultar | Consultar |
| Caja y turnos | Abrir y cerrar | Abrir y cerrar | Sin acceso | Abrir y cerrar |
| Ventas | Registrar y consultar | Registrar y consultar | Sin acceso | Registrar y consultar |
| Estructura | Administrar sucursales, almacenes, cajas y asignaciones | Sin acceso | Sin acceso | Sin acceso |
| Gestión cambiaria | Administrar permisos y autorizaciones | Gestionar según permisos | Sin acceso | Sin acceso |
| Reportes | Cierres, ventas e inventario; valoración disponible cuando está autorizada | Cierres, ventas e inventario | Inventario | Cierres y sus ventas |

La pantalla **Reportes** adapta sus secciones al rol. El dueño puede ver valoración cuando el sistema la habilita; el cajero consulta sus ventas; Inventario se enfoca en existencias. Si no aparece una opción, pide al administrador que revise tu rol y la asignación a la sucursal.

## 3. Las nueve pantallas

### 1. Resumen

Es la bienvenida y el punto de partida. Muestra el nombre de tu negocio, el estado de tu sesión, información general y la tasa oficial del BCV cuando hay una tasa vigente y validada. Si la tasa no está disponible o todavía no aplica, la pantalla lo indica y evita mostrar una conversión que no corresponda.

### 2. Productos

Aquí se consulta el catálogo con nombre, código, unidad, precio en dólares y estado del producto.

- Usa **Buscar** para localizar por nombre, SKU o código de barras. Los listados admiten paginación alfabética de 25 elementos; continúa con los controles de página para recorrer el catálogo.
- Si tu rol lo permite, pulsa **Nuevo producto** para registrar uno o **Editar** para corregir sus datos.
- **Importar CSV** permite cargar un archivo preparado para el catálogo; revisa el resumen y los avisos antes de confirmar.

### 3. Inventario

Selecciona la sucursal y el almacén para consultar las cantidades disponibles. Puedes revisar existencias, reservas y niveles mínimos. Según tus permisos, también podrás registrar una recepción de mercancía o realizar un conteo físico.

- En una recepción, indica el motivo, el producto, la cantidad recibida y el costo cuando corresponda.
- En un conteo, escribe la cantidad que realmente encontraste. El sistema registra la diferencia; no necesitas calcularla manualmente.
- Revisa la sucursal y el almacén antes de guardar para evitar operar en el lugar equivocado.

### 4. Consultar precio

Es la consulta rápida para atender a una persona sin preparar una venta. Selecciona la sucursal y el almacén cuando se solicite; busca por nombre, SKU o código de barras. Verás el precio y las existencias disponibles en ese almacén. La equivalencia en bolívares solo aparece con una tasa BCV vigente y validada.

### 5. Caja y turnos

Antes de registrar ventas, el cajero debe abrir un turno en la caja asignada. Selecciona la sucursal y la caja, revisa los importes iniciales y pulsa **Abrir turno**. Al terminar, introduce el efectivo contado en USD y VES, pulsa **Revisar cierre** y luego **Confirmar cierre**.

**Tiendas 100 % digitales:** si solo cobras por tarjeta, transferencia o Pago móvil y no guardas efectivo en caja, puedes abrir y cerrar con **$ 0,00** y **Bs. 0,00**. Si recibes efectivo, registra el conteo físico real. El efectivo esperado y las diferencias se consultan después en **Reportes → Cierres de caja**.

### 6. Ventas

Con un turno abierto, busca productos (también puedes usar el escáner), agrégalos al carrito y revisa cantidades y total. El modo de cantidad de cada producto determina si admite unidades enteras o fraccionarias. Si sales de la pantalla, el borrador de la venta se conserva para que puedas recuperarlo al volver. Elige la moneda de cobro (USD o VES), el método de pago y completa el importe exacto. La venta requiere una tasa BCV vigente y validada. La contingencia manual está deshabilitada actualmente (`FX_CONTINGENCY_ENABLED=false`); no cuentes con ella como alternativa de cobro.

**Una moneda por ticket en v1.1:** cada venta se cobra en USD o en VES, no combinando ambas monedas dentro del mismo ticket. Si necesitas cambiar la moneda, revisa el total y los importes antes de cobrar.

### 7. Estructura

Esta pantalla está reservada al dueño. Permite crear sucursales, agregar almacenes y cajas, y asignar miembros a cada sucursal. Mantén las asignaciones actualizadas para que cada persona trabaje únicamente en los lugares que le corresponden.

### 8. Gestión cambiaria

Pantalla de administración reservada al dueño y al administrador autorizado. Permite consultar el estado de la tasa y, cuando el proceso esté habilitado y autorizado, gestionar una contingencia manual con motivo, vencimiento, PIN y registro de auditoría. Una tasa manual no debe presentarse como tasa oficial del BCV. No autorices una tasa si no tienes la aprobación y la información necesarias.

### 9. Reportes

Aquí puedes consultar **Cierres de caja**, **Ventas** e **Inventario**, según tu rol.

- En **Cierres de caja**, elige un turno reciente para revisar fondo inicial, conteo final, ventas, efectivo esperado, diferencias y desglose de pagos.
- En **Ventas**, selecciona el período y la fecha que deseas consultar. Cuando corresponda, puedes elegir un rango personalizado.
- En **Inventario**, revisa las existencias y los valores que tu rol tenga permitidos.
- Usa **Exportar CSV** para guardar el reporte y abrirlo en una hoja de cálculo. El archivo contiene los datos del informe consultado; guárdalo únicamente en lugares autorizados por tu negocio.

## 4. Escáner con la cámara del teléfono

El botón **Escanear** está disponible en **Consultar precio**, **Ventas**, **Productos** y **Inventario**.

1. Abre la pantalla y pulsa **Escanear**.
2. Si el teléfono lo pregunta, permite el uso de la cámara mientras utilizas la aplicación.
3. Coloca el código de barras dentro del recuadro y espera a que se lea.
4. El código se coloca en la búsqueda correspondiente. Comprueba que el producto mostrado sea el correcto antes de continuar.

El escáner ayuda a localizar el producto; no registra una venta, no confirma una recepción y no guarda por sí solo un producto nuevo. Si la cámara no está disponible, cierra el visor y escribe el código manualmente. Usa la cámara solo desde un entorno seguro y con buena iluminación.

## 5. Calculadora opcional de vuelto

En **Ventas**, cuando el método de pago sea **Efectivo**, puedes indicar cuánto dinero físico te entregó la persona. La pantalla calcula cuánto vuelto debes entregar o cuánto falta por completar.

Este cálculo es una ayuda para atender al cliente: **no cambia el importe neto de la venta ni el monto que se registra como pago**. Comprueba el importe y entrega el vuelto correcto antes de finalizar.

## 6. Consejos para trabajar con tranquilidad

- Comprueba siempre la sucursal y el almacén seleccionados.
- No compartas tu cuenta de Google ni dejes la sesión abierta en un equipo compartido.
- Una venta usa una sola moneda por ticket en la versión v1.1: USD o VES.
- La tasa BCV puede no estar disponible, estar programada para una fecha futura o necesitar revisión. No hagas conversiones manuales para sustituir lo que muestra la aplicación.
- Los reportes de cierre son el lugar indicado para revisar el efectivo esperado y las diferencias.
- Si algo no coincide, detén la operación y contacta al administrador por el canal de WhatsApp de soporte. No intentes corregir movimientos anteriores por tu cuenta.

¡Gracias por cuidar cada detalle de tu negocio! Micro app está diseñada para ayudarte a trabajar con más claridad y confianza.
