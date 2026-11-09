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


## Gestión anual en Micro-app — propuesta aprobada para especificación

El calendario debe admitir tres vías complementarias, sin tratar ninguna como autoridad automática:

1. **Vigilancia automática:** consultar fuentes/canales oficiales de SUDEBAN de forma periódica y detectar publicaciones o correcciones. La automatización solo descubre y descarga evidencia; nunca publica ni activa una versión sin revisión y aprobación humana.
2. **Carga de PDF:** un usuario con permiso específico puede cargar el documento anual. El archivo queda en cuarentena y no afecta el calendario vigente.
3. **Entrada manual:** alternativa cuando no exista PDF, el documento no sea procesable o se necesite corregir una fecha con evidencia. Cada entrada debe indicar fuente, motivo y responsable; no permite inventar feriados.

### Ciclo de vida y aprobación

Estados propuestos: `uploaded`, `quarantined`, `scanned`, `parsed`, `pending_review`, `approved`, `published`, `rejected`, `superseded`.

- Cargar no equivale a aprobar ni publicar.
- La extracción automática de fechas produce un borrador que debe compararse con el documento y revisarse.
- Mostrar diferencias respecto de la versión anterior, fechas originales y fechas efectivas trasladadas, categorías (feriado nacional/bancario/no ejecutado) y advertencias.
- La publicación requiere permiso explícito `banking_calendar.publish` y reautenticación administrativa vinculada a esa versión concreta. La matriz de roles debe aprobar qué rol puede recibir ese permiso; no asumir que todo `admin` lo tiene.
- Para organizaciones que habiliten separación de funciones, quien carga o edita no puede ser el único aprobador. La segunda aprobación debe proceder de otra identidad individual.
- Una corrección posterior crea una nueva revisión; nunca sobrescribe ni elimina una versión ya publicada. Registrar quién solicitó, revisó y aprobó, timestamps UTC y Caracas, motivo, documento/hash y diff de fechas.

### Recordatorios y vigilancia

- Desde el **1 de diciembre**, advertir al Owner/administradores autorizados que revisen si se publicó el calendario del siguiente año.
- El **1 de enero**, si no existe versión verificada para el nuevo año, elevar la advertencia y mantener el estado explícito `pending_publication_or_verification`.
- Continuar vigilando publicaciones y correcciones durante el año.
- Los recordatorios no convierten fechas estimadas ni calendarios de terceros en días bancarios oficiales.
- La ausencia de calendario nuevo no debe bloquear indiscriminadamente las ventas ordinarias del comercio. Solo puede bloquear o poner en revisión las decisiones que dependan materialmente de determinar un día hábil bancario; en ese caso, no inferir el siguiente día hábil.

### Seguridad de documentos PDF

El PDF es entrada no confiable aunque su extensión sea `.pdf`. Aplicar defensa en profundidad antes de extraer datos o permitir visualización:

- Autorizar la carga en servidor y limitar tamaño, páginas, frecuencia y cuota por organización.
- Normalizar/reemplazar el nombre por un identificador generado; no usar rutas ni nombres aportados por el cliente.
- Comprobar extensión permitida, MIME detectado y firma binaria/magic bytes; ninguno de estos controles aislado demuestra seguridad.
- Mantener el original inmutable en almacenamiento privado, fuera de acceso público directo, con hash SHA-256 y metadatos de procedencia.
- Mantener el archivo en cuarentena hasta completar análisis antimalware y validación estructural con parser actualizado y aislado.
- Rechazar o neutralizar JavaScript, acciones de lanzamiento, formularios/acciones activas, adjuntos incrustados y contenido no requerido; no abrir enlaces externos ni ejecutar contenido del documento.
- Procesar sin red, con límites de CPU, memoria, tiempo, tamaño descomprimido y número de páginas. El parser nunca debe tener acceso a secretos ni a la base de datos de producción.
- Evaluar Content Disarm and Reconstruction (CDR) o renderizado a una copia segura para previsualización. No sustituir ni alterar el original probatorio.
- Si no existe un análisis seguro disponible, no marcar el archivo como limpio ni permitir publicación basada únicamente en su parseo; mantenerlo en cuarentena y ofrecer entrada manual de fechas.
- Registrar herramienta/versión y resultado del análisis. La descarga/visualización se sirve mediante autorización y handler, no mediante URL pública permanente.
- El contenido extraído se trata como dato, nunca como instrucciones ejecutables para la aplicación o agentes.

### Autorización y recuperación

La carga, edición, aprobación y publicación son permisos separados. La publicación utiliza el servicio compartido de autorización administrativa definido en `docs/decisions/ADR-20261109-admin-authorization-pin-recovery.md`. La prueba de PIN autoriza únicamente la publicación/revisión identificada por su hash, año, versión y nonce; es de un solo uso y expira rápidamente. El PIN de BCV no concede permiso de calendario, ni viceversa.

La recuperación de PIN exige reautenticación fuerte de la cuenta y MFA o código de recuperación de un solo uso cuando esté configurado; correo por sí solo no basta. La recuperación invalida PIN anterior, sesiones protegidas y autorizaciones pendientes, y genera auditoría/alerta. Para un Owner único debe existir un procedimiento extraordinario con verificación reforzada, sin PIN maestro ni puerta trasera.

### Criterios de aceptación adicionales

- [ ] Vigilancia detecta; no publica automáticamente.
- [ ] PDF permanece privado/en cuarentena hasta análisis satisfactorio.
- [ ] El parser está aislado, limitado y no ejecuta contenido activo.
- [ ] Entrada manual está disponible como alternativa segura.
- [ ] Comparación visual y aprobación humana antes de publicar.
- [ ] Permisos de carga, edición y publicación están separados y aprobados.
- [ ] Recordatorio 1 de diciembre y alerta 1 de enero funcionan con zona horaria definida.
- [ ] Historial inmutable, hash y procedencia se conservan por cada versión.
- [ ] Una versión no verificada nunca se presenta como oficial ni alimenta silenciosamente reglas de días hábiles.

**Estado:** diseño documental propuesto; no implementado. La seguridad efectiva del almacenamiento, análisis PDF, recordatorios y autorización debe probarse antes de habilitarlo.

## Historial de cambios

- 2026-11-09 — añadido diseño de carga manual/PDF, vigilancia no publicadora, recordatorios, cuarentena, procesamiento aislado y autorización administrativa compartida.