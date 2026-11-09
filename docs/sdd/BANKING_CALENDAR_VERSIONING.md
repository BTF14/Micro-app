# Calendario bancario SUDEBAN — versionado y vigencia

**Estado:** regla documental aprobada por el propietario del producto; el PDF 2026 fue aportado en la conversación el 2026-11-09.  
**Alcance:** referencia para determinar días hábiles bancarios venezolanos en la integración BCV. No cambia por sí sola la política de aceptación de tasas en checkout.

## Fuente recibida

- Archivo recibido: `bcv_calendario_2026.pdf`.
- Título visible en el documento: **Calendario bancario 2026**.
- El propietario lo identifica como el calendario SUDEBAN 2026.
- La copia recibida contiene feriados nacionales y feriados bancarios nacionales, incluidas fechas de ejecución trasladadas y la nota de feriados que no se ejecutan cuando coinciden con fin de semana.
- Esta referencia se registra como documento aportado por el propietario. La procedencia del archivo no se verificó independientemente contra una URL/circular oficial en esta tarea; no afirmar una verificación externa que no se realizó.

## Regla de vigencia por año

1. Durante 2026, usar la versión 2026 recibida como calendario de referencia del proyecto.
2. No buscar, exigir ni inventar un calendario 2027 antes de que SUDEBAN lo publique.
3. Al comenzar 2027, comprobar si SUDEBAN publicó su calendario bancario 2027.
4. Cuando se publique, incorporar el documento como una **nueva versión anual** y establecer su vigencia desde el año correspondiente, conservando intacta la versión 2026.
5. Si el calendario del nuevo año aún no está publicado, conservar como referencia el último calendario oficial disponible y marcar el año nuevo como **pendiente de publicación/verificación**. No inferir feriados, traslados ni días bancarios especiales.
6. Cada versión debe conservar año, título, fecha de incorporación, URL/circular oficial cuando exista, hash del archivo fuente y estado de verificación. Las sustituciones son aditivas: nunca sobrescribir el histórico.

## Uso en la integración BCV

- El calendario sirve para determinar días bancarios hábiles y orientar la expectativa de publicación/fecha efectiva de la tasa BCV, incluida la selección de la siguiente fecha hábil cuando BCV la publique anticipadamente.
- El calendario no crea una tasa, no autoriza a reutilizar una tasa anterior y no sustituye la fecha efectiva publicada por BCV.
- Una fecha prepublicada solo puede utilizarse cuando llegue su fecha efectiva, de acuerdo con la validación fail-closed ya definida para checkout.
- No asumir que sábado, domingo o un feriado nacional/bancario tienen idéntico tratamiento: respetar las categorías y notas explícitas de cada calendario anual.
- Si el documento vigente falta, es ambiguo o no está verificado para el año consultado, no inventar el próximo día hábil. Registrar el bloqueo y mantener la operación conforme a las reglas fail-closed de BCV/checkout.
- Cualquier excepción, cierre extraordinario o modificación posterior de SUDEBAN debe incorporarse como nueva evidencia/versionado, sin editar retroactivamente el archivo histórico.

## Separación de responsabilidades

- **SUDEBAN:** calendario bancario y días feriados bancarios.
- **BCV:** publicación de la tasa y su fecha efectiva.
- **Micro-app:** conserva fuente, versión de calendario, fecha efectiva de tasa y snapshot/auditoría pertinente; nunca deriva un valor de tasa del calendario.

## Pendientes antes de automatizar

- Incorporar el PDF fuente al repositorio como artefacto binario verificable mediante un mecanismo que preserve sus bytes; no convertirlo ni reconstruirlo desde OCR como si fuera el original.
- Obtener y guardar la URL/circular oficial de SUDEBAN cuando sea accesible para corroborar la procedencia del documento recibido.
- Añadir pruebas de selección de días hábiles para feriados, fines de semana, fechas trasladadas, cambio de año y ausencia del calendario del año nuevo.
- No habilitar Cron ni realizar cambios de producción por este registro documental.
