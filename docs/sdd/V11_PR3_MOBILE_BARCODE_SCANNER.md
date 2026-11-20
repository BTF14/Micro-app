# SDD — Escáner móvil de códigos de barras (v1.1 / PR 3)

- **Estado:** diseño aprobado para dividirse en Micro-PR 3A y 3B.
- **ADR vinculante:** `docs/decisions/ADR-20261114-v11-product-scope-and-roadmap.md`.
- **Presupuesto:** USD 0; sin dependencias npm nuevas ni servicios externos.

## Objetivo y límites

Permitir escanear un código desde un teléfono y usar el valor reconocido como término de búsqueda del producto. El reconocimiento ocurre íntegramente en el dispositivo mediante `BarcodeDetector` nativo y la cámara se obtiene con `navigator.mediaDevices.getUserMedia` cuando el navegador lo permite.

El escáner no crea una venta, no selecciona automáticamente una forma de pago y no cobra. El resultado únicamente alimenta el buscador existente `QuickProductLookup`, que sirve tanto a **Consultar precio USD/VES** como al buscador dentro de **Ventas**. La selección y las acciones comerciales permanecen bajo control explícito de la persona.

## Evidencia y contratos existentes

- `apps/api/src/inventory-read.ts`: la búsqueda de inventario acepta `sort=relevance`; la coincidencia exacta `p.barcode = $exact` se prioriza antes de otras coincidencias. El escáner entrega el texto reconocido como término normal de búsqueda y deja que el endpoint aplique su ordenación existente.
- `apps/web/src/QuickProductLookup.tsx`: el input ya acepta texto/código, aplica debounce y consulta inventario por sucursal y almacén. En 3B el valor escaneado se entregará a este buscador; no se duplicará la consulta ni se creará un flujo paralelo.
- `apps/web/public/_headers`: hoy declara `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()` y CSP con `connect-src 'self'`. La Micro-PR 3B cambiará únicamente la directiva de cámara a `camera=(self)`, manteniendo `microphone=()`, las demás restricciones y CSP `connect-src 'self'`. La política actual bloquea cámara deliberadamente; 3B no puede habilitar el visor sin ese cambio explícito.

## Diseño de seguridad y experiencia

1. **Capacidad progresiva:** comprobar contexto seguro (`isSecureContext`), `navigator.mediaDevices.getUserMedia` y `BarcodeDetector`. Si falta cualquiera, mostrar explicación breve en español y conservar siempre la búsqueda manual.
2. **Formatos:** solicitar solo formatos retail conocidos: `ean_13`, `ean_8`, `upc_a`, `upc_e`, `code_128`, `code_39`, `code_93`, `itf`, `codabar`, `qr_code`. Si el navegador informa formatos, usar la intersección ordenada; no inventar soporte cuando informa una lista vacía.
3. **Privacidad local:** los frames, imágenes y video nunca se serializan, almacenan ni envían al servidor. El servidor recibe únicamente la búsqueda textual normal del catálogo cuando `QuickProductLookup` realiza su consulta existente.
4. **Ciclo de vida estricto:** 3B detendrá inmediatamente todos los `MediaStreamTrack`, el bucle de detección y cualquier timer/animación al aceptar un código, cerrar el visor, recibir `visibilitychange` con documento oculto o desmontar el componente. La limpieza será idempotente y cubrirá errores de inicialización.
5. **Anti-repetición:** normalizar el valor y aplicar deduplicación determinista por código y ventana temporal (1.500 ms por defecto). Un código distinto puede aceptarse inmediatamente.
6. **Errores comerciales:** no mostrar nombres DOM, stack traces ni códigos técnicos. Permisos denegados, cámara ausente/ocupada y contexto bloqueado explican cómo continuar con la búsqueda manual.
7. **Acción explícita:** escanear solo rellena/inicia la búsqueda de producto; nunca agrega líneas de venta, confirma una operación ni cobra.

## División de entrega

### Micro-PR 3A — SDD, ODD y helpers puros

Alcance limitado a cuatro archivos nuevos:

- Este SDD.
- `odd/tasks/mobile-barcode-scanner.md`, siguiendo exactamente `odd/TASK_TEMPLATE.md`.
- `apps/web/src/barcode-scanner.ts`: contratos tipados, formatos retail, detección de capacidades, selección de formatos, normalización, deduplicación y traducción de errores. Sin JSX, cámara, red, dependencias ni efectos secundarios.
- `apps/web/src/barcode-scanner.test.ts`: Vitest determinista para soporte, formatos, entradas límite, cooldown y errores de cámara.

No se modifica ningún archivo existente. Esta etapa no habilita cámara en producción ni integra UI.

### Micro-PR 3B — visor e integración

En una PR separada y después de revisar 3A:

- Crear el componente visor/cámara con BarcodeDetector y `getUserMedia`, usando los contratos y helpers de 3A.
- Cambiar en `apps/web/public/_headers` `camera=()` a `camera=(self)`; mantener CSP `connect-src 'self'` y el resto de políticas.
- Integrar el disparador y el resultado con `QuickProductLookup` para las dos superficies existentes: consulta USD/VES y buscador de Ventas. No crear flujo de venta autónomo.
- Añadir pruebas jsdom para estados de soporte, permisos, fallback, cierre y limpieza de recursos.
- Añadir E2E Playwright en viewport móvil **390x844**, verificando búsqueda por código y ausencia de desbordamiento horizontal.
- Cerrar la tarea ODD y sincronizar la documentación de cierre solo en esa PR de integración.

## Fuera de alcance y gates

- **0 SQL, 0 backend, 0 workflows, 0 dependencias npm** en 3A.
- No enviar video, imágenes ni frames; no añadir analítica ni telemetría de cámara.
- No cambiar permisos, CSP, rutas API, modelo de inventario ni lógica de ventas en 3A.
- Mantener intactos: `AC-6 OPEN`, `FX_CONTINGENCY_ENABLED=false`, `BCV_SYNC_ENABLED=false`, `Issue #53 OPEN/P0`, `freeze v1.1` y `PRODUCTION: NOT READY`.
- La apertura de esta PR no levanta el freeze, no autoriza despliegues y no constituye aprobación de producción.

## Criterio de salida de 3A

Los cuatro archivos están presentes y son los únicos cambios; los helpers y sus pruebas cubren todos los casos enumerados; el ODD conserva pendientes explícitos para 3B; GitHub Actions se valida sobre el SHA final exacto. La PR permanece OPEN / Draft, sin merge ni auto-merge.
