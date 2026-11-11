## Delta de implementación — selección BCV por fecha efectiva — 2026-11-08

La revisión detectó que la selección anterior podía considerar una tasa prepublicada del lunes durante sábado/domingo, contradiciendo la instrucción expresa del propietario de no utilizarla antes de su `effective_date`. Se corrigió el código en ambas ramas:
- #255: `findApplicableBcvRate()` consulta únicamente `effective_date = fecha Caracas de hoy`; el histórico puede mostrar tasas futuras como `scheduled`, pero no como aplicables.
- #269: `findApplicableCheckoutRate()` exige la misma igualdad exacta.
- La migration 0017 del ensayo se preservó sin cambios de checksum. La corrección SQL se incorpora como migration 0020 y sus assertions.
- Los tests unitarios/integración se actualizaron para rechazar una tasa efectiva lunes el sábado. CI exact-HEAD de estos commits está pendiente de verificación.

# Continuidad técnica — BTF14/Micro-app
**Corte:** 2026-11-08 UTC  
**Objetivo:** continuar auditoría e integración segura del MVP sin empezar de cero, sin gastar dinero y sin comprometer producción.

## Instrucción principal
Actúa como responsable técnico senior. Lee primero `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/WORK_CHECKPOINT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/SECURITY_ROADMAP.md` y este documento. Después verifica GitHub en vivo; los SHA y CI que siguen son snapshots de este corte, no sustituyen la consulta actual.

No pedir Build IDs, capturas, terminal, CLI, TinyFish ni reconexiones si la información está en GitHub o en la documentación. El propietario trabaja desde teléfono. Si un dato esencial falta, preguntar una sola vez y aceptar respuesta en texto. No repetir trabajo documentado.

## Decisiones de producto confirmadas
1. Toda venta requiere tasa BCV aplicable y vigente, incluso si se liquida 100% en USD.
2. La tasa del siguiente día hábil puede utilizarse **solo si BCV la publicó oficialmente por anticipado y su `effective_date` corresponde a la fecha de la operación**.
3. Una tasa efectiva lunes publicada el viernes se usa desde el lunes, nunca viernes/sábado/domingo.
4. Si no hay tasa oficial aplicable a la fecha de venta, bloquear checkout. Conservar el último dato histórico para auditoría, pero no presentarlo como vigente.
5. Los pagos conservan moneda e importe originales; equivalente VES referencial no implica conversión ni cobro adicional.
6. Guardar snapshot inmutable de tasa, fuente, fecha de publicación y fecha efectiva. No recalcular ventas históricas.
7. No inventar umbral de frescura temporal para `fetched_at`: representa inserción, no última comprobación exitosa. Diseñar señal separada y persistente de last-attempt/last-success y degradación.
8. La fuente primaria es el BCV oficial. No usar tasas de terceros ni fechas inferidas.

## Estado de PRs al corte
- `main`: SHA observado previamente `9247cb24effd7d98be29aabe8d44c51fbab7a138`. Antes de cualquier acción, volver a leer main; no asumir que sigue igual.
- PR #255 BCV: OPEN/Draft. Nuevo HEAD documental `9624951182245c79d733b2393b11ce82daaadb1c`; 56 ahead / 0 behind respecto a main en la consulta. Check-runs exact-HEAD: 5/15 SUCCESS, 10 pendientes, 0 fallos observados. Workflows: 5/13 SUCCESS, 8 pendientes, 0 fallos observados.
- PR #269 checkout/ledger: OPEN/Draft. Nuevo HEAD documental `7dd1c07612d960faa206b4d5d36eeaf91dc15a94`; 30 ahead / 0 behind. Check-runs exact-HEAD: 3/15 SUCCESS, 12 pendientes, 0 fallos observados. Workflows: 3/14 SUCCESS, 11 pendientes, 0 fallos observados.
- No reutilizar CI de SHAs anteriores. Reconsultar estado de checks, workflows, reviews y threads en el SHA actual.
- Las dos PR comparten cambios en `.github/workflows/ci.yml` y `apps/api/src/index.ts`. Integración futura debe preservar ambos conjuntos; no reemplazar archivos completos ni fusionar como cambios independientes.
- Ambas siguen Draft. No hay aprobación formal independiente registrada.

## Archivos documentales actualizados en las ramas
- #255: `docs/sdd/BCV_RATE_INTEGRATION.md`, commit `9624951182245c79d733b2393b11ce82daaadb1c`.
- #269: `docs/sdd/SALES_CHECKOUT_MODEL.md`, commit `7dd1c07612d960faa206b4d5d36eeaf91dc15a94`.
- Este documento se agrega a la rama de #269 para continuidad. Estos cambios no están en main.

## Bloqueos técnicos antes de quitar Draft
1. Implementar y probar selección por fecha efectiva BCV; tasa futura solo desde su fecha efectiva; sin fallback silencioso a tasa antigua.
2. Corregir semántica de `fetched_at` o, preferiblemente, añadir estado persistente separado de last-attempt/last-success, sin alterar inmutabilidad histórica.
3. Definir política de anomalías/variación con evidencia y pruebas; no inventar umbrales.
4. Añadir alerta operativa externa o canal de alerta fiable; logs sanitizados no bastan.
5. Validar parser con fixture HTML real oficial BCV. Los fixtures sintéticos no cierran ese gate.
6. Obtener/verificar calendario bancario oficial de feriados y definir comportamiento.
7. Probar checkout USD, VES, snapshots, fecha efectiva, fines de semana, feriados, fallos BCV, parciales, sobrepago/cambio, anulaciones y devoluciones/auditoría.
8. Revisar permisos/identidad runtime y rehearsal ya documentado; no repetir escrituras Neon sin razón y autorización.
9. #255 agrega Cron `0 22 * * 1-5` (18:00 Caracas) y su handler corre en production. No fusionar/desplegar ni activar el Cron accidentalmente. Antes, añadir guard de activación por defecto deshabilitado y demostrarlo en tests, o plan de rollout aprobado.
10. Antes de merge, revisar efecto de GitHub->Cloudflare auto-build. No hacer merges a main hasta confirmar estado activo de Cloudflare y plan de despliegue; no rollback a ciegas.

## Seguridad y límites
- No tocar Neon main ni datos reales.
- No ejecutar `bootstrap-and-migrate`, SQL manual ni escrituras remotas. La rehearsal previa ya fue documentada; no repetirla sin necesidad.
- No tocar secretos, DNS, billing, configuración manual Cloudflare ni despliegues.
- No fusionar #255 ni #269. No cerrar issues/PRs no solicitados.
- No fingir APPROVED ni tratar CI verde como aprobación formal.
- No hacer force-push.
- No activar Cron productivo.
- Mantener gasto incremental USD 0.

## Próximas acciones autónomas
1. Verificar que los HEADs y Draft states coinciden con el corte y consultar CI exact-SHA.
2. Inspeccionar implementación actual de selección de tasa en API latest y checkout, más esquema de `exchange_rates`.
3. Diseñar una política determinista de elegibilidad basada en `effective_date`, fuente oficial, estado de validación y last-success; cubrir viernes→lunes y feriados.
4. Implementar primero en ramas aisladas con pruebas unitarias y PostgreSQL, manteniendo commits pequeños.
5. Actualizar docs de estado y PR descriptions con SHA real, resultados CI exactos y bloqueos restantes.
6. No solicitar intervención al propietario salvo acción externa estrictamente necesaria; dar instrucciones móviles, cortas y paso a paso.

## Nota de honestidad de estado
El trabajo actual es documental y de auditoría. La política ya fue escrita en las ramas de PR, pero **no se ha implementado todavía en código, no está en main y no está en producción**. Los CI de los dos nuevos commits documentales estaban pendientes al momento del corte.
