# Calendario bancario 2026 — versionado, procedencia y vigencia

**Estado:** regla documental aprobada por el propietario del producto; el PDF 2026 fue aportado en la conversación el 2026-11-09.  
**Alcance:** referencia para determinar días hábiles bancarios venezolanos en la integración BCV. No cambia por sí sola la política de aceptación de tasas en checkout.

## Fuente recibida y verificación de procedencia

- Archivo recibido: `bcv_calendario_2026.pdf`.
- Título visible: **Calendario bancario 2026**. La página tiene el logotipo BCV; por tanto, no debe describirse como un PDF emitido por SUDEBAN.
- Integridad del archivo aportado: 84.236 bytes; SHA-256 `bc5d443d5bb4cb449d7c2e2421b902bb0c63bed64d02f5794d79f1b197e89018`.
- El documento contiene feriados nacionales y bancarios, fechas efectivas trasladadas y una nota para feriados que no se ejecutan cuando coinciden con fin de semana.
- **Corroboración secundaria:** se localizó una copia de terceros de la circular SUDEBAN `SIB-DSB-CJ-OD-#08327`, fechada el 31-10-2025, titulada “Calendario Bancario Año 2026”: [copia alojada por iusdata](https://iusdata.com/wp-content/uploads/2025/11/Calendario-Bancario-2026.pdf). Las fechas efectivas que aparecen en el PDF aportado (por ejemplo, 12/01, 19/01, 18/05, 08/06, 14/09, 23/11 y 14/12) coinciden con los traslados descritos en esa copia de la circular.
- La copia de la circular no está alojada en el dominio oficial y el PDF aportado lleva marca BCV. Esta coincidencia respalda el contenido como referencia, pero **no autentica la procedencia ni sustituye la circular oficial**. La URL oficial de SUDEBAN es https://sudeban.gob.ve/; la sección “Calendario Bancario” aparece en el portal, pero la recuperación directa no respondió durante la consulta del 2026-11-09.
- Registrar el archivo como **aportado por el propietario / marca BCV visible / contenido corroborado secundariamente / procedencia oficial pendiente**. No etiquetarlo como PDF oficial de SUDEBAN ni afirmar que su binario es la circular original.

## Regla de vigencia por año

1. Durante 2026, conservar el PDF aportado como **referencia documental provisional**. No automatizar decisiones de días hábiles basándose únicamente en ese archivo mientras la circular oficial no se autentique.
2. No buscar, exigir ni inventar un calendario 2027 antes de que SUDEBAN lo publique.
3. Al comenzar 2027, comprobar si SUDEBAN publicó su calendario bancario 2027.
4. Cuando se publique, incorporar el documento como una **nueva versión anual** y establecer su vigencia desde el año correspondiente, conservando intacta la versión 2026.
5. Si el calendario del nuevo año aún no está publicado, conservar como referencia el último calendario cuya autoridad esté verificada y marcar el año nuevo como **pendiente de publicación/verificación**. No inferir feriados, traslados ni días bancarios especiales.
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

- Incorporar el PDF aportado al repositorio como artefacto binario verificable mediante un mecanismo que preserve sus bytes; el archivo está conservado en la biblioteca del propietario, pero aún no se ha añadido al repositorio.
- Obtener y guardar la URL/circular oficial de SUDEBAN cuando sea accesible para autenticar la procedencia y confirmar que la versión anual no ha sido modificada.
- Añadir pruebas de selección de días hábiles para feriados, fines de semana, fechas trasladadas, cambio de año y ausencia del calendario del año nuevo.
- No habilitar Cron ni realizar cambios de producción por este registro documental.
