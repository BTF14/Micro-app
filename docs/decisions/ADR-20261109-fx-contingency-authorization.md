# ADR — Autorización temporal de contingencia cambiaria

- **ID:** ADR-20261109-fx-contingency-authorization
- **Estado:** accepted (política/arquitectura; implementación condicionada a AC-6/AC-7)
- **Fecha:** 2026-11-09
- **Responsables:** producto, arquitectura, seguridad y asesoría contable/legal
- **Relacionado:** `odd/tasks/fx-contingency-management.md`, `docs/sdd/FX_CONTINGENCY_MANAGEMENT.md`, PR #255, #269 y #287 (contexto BCV/checkout; no se modifican); PR documental #288.

## Resolución confirmada por el propietario — 2026-11-15

- **Actores:** Owner o Admin con delegación explícita `fx.contingency.authorize`, acotada a sucursales asignadas al Admin y no concedida por defecto.
- **PIN:** individual, mínimo 8 dígitos, KDF fuerte con sal única; rate limit por cuenta/IP y fail-closed.
- **Desviación:** banda razonable respecto de la última tasa BCV válida; desvíos altos requieren confirmación reforzada y auditada.
- **Auditoría:** inmutable y generada en servidor con `actor_user_id`, rol efectivo, sucursal, timestamp UTC del servidor, motivo, origen manual, tasa y vigencia.
- **Vigencia:** máximo 24 horas, expiración automática, renovación explícita con PIN y nuevo evento auditable; retorno automático a BCV cuando exista tasa oficial válida aplicable.
- **Gates:** AC-5 resuelto; AC-6 legal/contable y AC-7 revisión independiente de seguridad previa a implementación permanecen pendientes. No se autoriza código ni activación.

## Contexto y problema

La política de checkout exige una tasa BCV aplicable y válida, incluso en ventas liquidadas en USD. La tasa prepublicada solo se usa desde su `effective_date`; no se permite usarla anticipadamente ni recurrir silenciosamente a una tasa antigua. Un feriado, retraso de publicación o fallo de la fuente puede bloquear conversiones y continuidad de ventas.

El propietario pidió una capacidad administrativa para autorizar temporalmente una tasa manual, con PIN en pequeños comercios y autenticación reforzada en empresas, trazabilidad completa y separación entre cajeros y administradores.

Existe una tensión que debe resolverse antes de implementar: la excepción manual altera el comportamiento de fail-closed actual y la matriz aprobada reserva al Owner la configuración de políticas organizacionales. El concepto está aprobado para especificación, pero la asignación exacta del permiso y la validez legal/contable de la excepción no se presumen resueltas.

## Decisión

Proponer un módulo **Gestión de contingencia cambiaria** separado del modo BCV normal:

1. BCV automático continúa como modo predeterminado.
2. La contingencia manual nunca se activa automáticamente por fallo de BCV.
3. La tasa manual es explícitamente no oficial y solo puede usarse bajo autorización temporal, motivo, alcance, vigencia y autenticación reforzada.
4. En pequeño negocio, PIN individual de 8 dígitos como factor de reautenticación de una cuenta ya autenticada; no sustituye login ni autorización.
5. En empresa, identidad individual + contraseña reciente + MFA; doble aprobación opcional por dos personas distintas.
6. El permiso será explícito y de mínimo privilegio: Owner puede autorizar; Admin solo con delegación `fx.contingency.authorize`, limitada a sucursales asignadas y nunca concedida por defecto.
7. Por defecto, el alcance es una sucursal. Las autorizaciones vencen automáticamente en servidor y no dependen de Cron.
8. Toda autorización y transición se conserva append-only; las ventas guardan snapshot inmutable de fuente, valor y autorización.
9. Si no se puede validar la autorización en servidor/DB, el checkout falla cerrado.
10. La recuperación de BCV no reescribe ventas; la salida de contingencia se registra como nueva transición.
11. La confirmación del cajero y la aceptación del cliente son evidencias distintas.
12. La habilitación comercial queda condicionada a revisión legal/contable y pruebas de seguridad.

El propietario confirmó el 2026-11-15 un máximo de **24 horas por autorización para todos los tenants**, independiente del horario comercial. Expiración automática; renovación explícita con PIN y auditoría separada. Es una decisión operativa de producto, no un dictamen legal/contable.

## Alternativas consideradas

- **Solo BCV y bloquear siempre:** máxima simplicidad y consistencia con fail-closed, pero sin continuidad operativa ante incidencias justificadas.
- **Fallback automático a última tasa o proveedor alternativo:** rechazado; oculta el origen y vigencia, crea riesgo financiero y contradice la política efectiva-date.
- **Interruptor simple y tasa compartida por cajeros:** rechazado; permite cambios no atribuibles, sin vigencia ni controles suficientes.
- **Tasa manual con autorización temporal y auditoría:** recomendada; permite continuidad controlada sin disfrazar la fuente manual como oficial.

## Consecuencias y riesgos

Positivas:
- Reduce interrupciones operativas con controles.
- Atribuye quién autorizó, quién aprobó y qué venta consumió la tasa.
- Separa operación de caja, política organizacional y administración de seguridad.
- Facilita revisión posterior por sucursal y empresa.

Riesgos/obligaciones:
- Puede entrar en conflicto con obligaciones legales/fiscales si la tasa no es admisible para la operación.
- Cambia el contrato actual de checkout fail-closed; requiere aprobación explícita y revisión legal.
- Amplía superficie de autorización, autenticación, concurrencia y auditoría.
- El PIN de baja entropía necesita rate limit y KDF adecuados; no debe ser la única autenticación de una sesión anónima.
- La delegación de Admin requiere cambio formal de matriz de permisos.
- Las notificaciones y mecanismos de aceptación pueden generar costes o datos personales; mantenerlos fuera de alcance hasta evaluación.

## Reversión o sustitución

- Deshabilitar la capacidad mediante feature flag por organización, sin borrar autorizaciones ni snapshots históricos.
- Revocar autorizaciones activas para nuevas ventas mediante evento auditado.
- Volver al modo BCV solo cuando exista tasa aplicable; si no, bloquear conversión.
- No borrar ni recalcular ventas que ya consumieron tasa manual.
- Cambios destructivos o migraciones reales requieren los gates de la Constitución y backup/recovery.

## Evidencia

- Repositorio: https://github.com/BTF14/Micro-app
- Rama documental: `docs/fx-contingency-management-20261109` (creada desde main `9247cb24effd7d98be29aabe8d44c51fbab7a138`).
- SHA de la primera versión documental: `53d3d98257abb7deac853599021ebcb438b5ffda` (la corrección de enlaces y el cierre documental se validarán en el HEAD final de PR #288).
- Archivos: `docs/sdd/FX_CONTINGENCY_MANAGEMENT.md`, `odd/tasks/fx-contingency-management.md`.
- Fuentes primarias: aún no se ha completado la revisión legal/contable; no se hace afirmación de cumplimiento.
- Limitaciones: no se ha auditado aún el esquema real de auth/auditoría para seleccionar KDF, MFA ni tablas; no hay implementación.

## Historial

- 2026-11-09 — creación como propuesta; decisión de producto documentada para evaluación y diseño, no implementada.


## Addendum — resolución del propietario (2026-11-15)

1. **Owner** puede autorizar una tasa manual dentro de su organización y alcance permitido.
2. **Admin** solo puede autorizar con delegación explícita `fx.contingency.authorize`, limitada a sus sucursales asignadas activamente; no es permiso por defecto ni implícito en el rol.
3. PIN individual >=8 dígitos, KDF fuerte con sal única, rate limiting por cuenta/IP y fail-closed. Banda razonable frente a última tasa BCV válida; confirmación reforzada ante desviaciones altas y denegación fuera de límites duros.
4. Auditoría inmutable server-side: `actor_user_id`, rol efectivo, sucursal, timestamp UTC del servidor, motivo, origen manual, tasa y vigencia. El cliente no controla la atribución.
5. Vigencia máxima **24 h**, independiente del horario del comercio; expiración automática server-side; renovación explícita con PIN y evento separado; retorno automático a BCV cuando exista tasa oficial válida aplicable.

**AC-5 resuelto. AC-6 legal/contable y AC-7 revisión independiente de seguridad previa a implementación siguen pendientes.** Esta aceptación no levanta freeze ni autoriza implementación.
