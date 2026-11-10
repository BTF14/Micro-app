# Política de fuentes externas para BCV y calendario bancario

**Última actualización:** 2026-11-10  
**Ámbito:** investigación, datos de referencia y decisiones operativas que dependan de BCV, SUDEBAN o calendarios bancarios venezolanos.

## Contexto operativo confirmado por el propietario

- La página de SUDEBAN no funciona de forma suficientemente fiable para depender exclusivamente de ella al consultar calendarios o documentos.
- La página del BCV también presenta inestabilidad y puede fallar o resultar inaccesible en determinadas consultas.
- El propietario indicó que, hasta el momento, no hay un calendario bancario oficial 2027 disponible de forma verificable para el proyecto.
- El propietario proporcionó un calendario bancario 2026 que no es oficial, pero representa la mejor información obtenible hasta el momento. Debe conservarse como referencia provisional, no descartarse por no ser oficial ni elevarse a la categoría de publicación oficial.

## Reglas obligatorias para futuras consultas

1. **No perseguir indefinidamente una publicación oficial que no está disponible.** Para 2027, declarar que no se ha podido verificar un calendario oficial disponible y continuar con fuentes secundarias cuando el trabajo necesite una referencia.
2. **No afirmar que un documento no existe solo porque una página falla.** Diferenciar entre “no publicado”, “no localizado”, “no accesible” y “no verificable”. Usar la formulación más precisa que respalde la evidencia.
3. **Usar terceros cuando la fuente primaria sea inaccesible o insuficiente.** Se permite utilizar bancos, asociaciones, medios y proveedores de información reconocibles como fuentes secundarias. Registrar nombre de la fuente, URL, fecha de consulta, fecha/periodo al que aplica y cualquier discrepancia.
4. **Corroborar cuando sea posible.** Para fechas bancarias relevantes, preferir dos fuentes secundarias independientes. Si solo existe una, marcar la fecha como provisional y explicitar la incertidumbre.
5. **Mantener la procedencia visible.** Clasificar cada dato como:
   - OFICIAL: publicación primaria accesible y verificable del organismo competente.
   - SECUNDARIO_CORROBORADO: dato reproducido por al menos dos fuentes secundarias independientes y consistentes.
   - SECUNDARIO_PROVISIONAL: dato de una fuente secundaria sin corroboración suficiente.
   - NO_VERIFICADO: información contradictoria, incompleta o sin fuente trazable.
6. **No convertir terceros en fuente oficial.** Una fecha tomada de un banco o medio no debe describirse como “calendario oficial de SUDEBAN/BCV”.
7. **Registrar fallos de acceso como fallos de acceso.** Guardar URL, fecha/hora y error observado si se conoce. No inferir que el dato no existe, que fue retirado o que el organismo no lo publicó.
8. **BCV y tasas de cambio:** distinguir la publicación primaria del BCV, una reproducción de terceros y cualquier dato no confirmado. No inventar tasas, fechas efectivas ni disponibilidad de endpoints. Si la fuente oficial falla, utilizar un tercero para descubrimiento, contraste o referencia provisional únicamente con trazabilidad, atribución explícita y controles de consistencia; no etiquetar ese dato como respuesta oficial del BCV. **Una tasa de terceros no satisface por sí sola el requisito P0 de tasa BCV válida para checkout**: hasta que exista una decisión funcional/legal explícita y una fuente aceptada, el checkout debe seguir fallando cerrado si no puede verificarse la tasa oficial exigida.
9. **Calendario 2026 aportado por el propietario:** mantenerlo etiquetado como SECUNDARIO_PROVISIONAL / NO OFICIAL salvo que una publicación primaria posterior permita verificarlo. No reemplazarlo por una búsqueda repetida que no aporte evidencia nueva.
10. **Calendario 2027:** no bloquear el desarrollo por la ausencia de un PDF o circular oficial accesible. Usar fuentes secundarias según las reglas anteriores y actualizar la clasificación cuando aparezca evidencia nueva.

## Implicaciones de producto y seguridad

- Los calendarios son datos de referencia sujetos a actualización; no deben codificarse como verdades inmutables sin procedencia y fecha de revisión.
- La incertidumbre sobre un feriado no debe resolverse silenciosamente. Si afecta una operación financiera, vencimiento o cálculo sensible, mostrar/registrar la procedencia y aplicar la política de negocio aprobada. El calendario 2026 provisional puede orientar planificación operativa, pero no demostrar por sí solo cumplimiento legal/fiscal ni determinar una obligación financiera sensible.
- Esta política de fuentes no autoriza a alterar la lógica de conversión, la política de frescura BCV, los controles de checkout ni los criterios contables. Esos cambios requieren sus decisiones funcionales y técnicas correspondientes.
- No usar una fecha de calendario secundaria para inferir por sí sola que el BCV no publicará una tasa ese día. Calendario bancario y publicación de tasa son hechos relacionados, pero no equivalentes.

## Regla de continuidad para asistentes y revisores

Antes de preguntar nuevamente por un calendario oficial 2027 o repetir una búsqueda directa fallida de SUDEBAN/BCV, leer este documento y los artefactos de calendario existentes. Repetir una consulta solo si hay una razón concreta para esperar información nueva o si se necesita validar una fecha específica. No volver a solicitar al propietario el calendario 2026: ya indicó que lo proporcionó y que, aunque no oficial, es la información disponible hasta el momento.
