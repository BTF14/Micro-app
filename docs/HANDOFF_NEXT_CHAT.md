> **CHECKPOINT VIGENTE — continuidad verificada 2026-10-30 UTC (supersede snapshots anteriores):** el HEAD de `main` confirmado en GitHub es `ec6a2b84e2f84a0f5d2340ced86449804a1b6ed4`, merge commit de PR #173. PR #172 está fusionada en `a7fa51d059d35fc679b53de112689a19f37fe967`; PR #173 está fusionada en `ec6a2b84e2f84a0f5d2340ced86449804a1b6ed4`. La PR #173 solo añadió documentación de continuidad (6 archivos, 12 adiciones, 0 eliminaciones); no cambió runtime, esquema, migraciones, workflows ni infraestructura. La PR #173 registró el resultado de #172, pero no registró su propio merge SHA como estado vigente; este checkpoint corrige esa omisión. Antes de cualquier acción futura, volver a consultar main, PRs, issues y checks en GitHub: este SHA es una referencia de reanudación, no garantía de que siga siendo HEAD más adelante.
>
> **Estado de trabajo y gates:** issues [#53](https://github.com/BTF14/Micro-app/issues/53) y [#78](https://github.com/BTF14/Micro-app/issues/78) siguen abiertas. #53 conserva como gate la autorización explícita de la matriz por operación y el aislamiento multi-tenant de futuras rutas comerciales. La matriz `docs/sdd/role-permission-decision-matrix.md` sigue **NO APROBADA**. #78: comentario GitHub [6526716084](https://github.com/BTF14/Micro-app/issues/78#issuecomment-6526716084) registra lectura pública de solo lectura: GET del Worker /health respondió con `{"status":"ok","service":"micro-app-api","stage":"scaffold"}` y Pages cargó; no se observaron headers HTTP ni se pudo emitir preflight OPTIONS con Origin personalizado. Por tanto CORS, credenciales, métodos/headers permitidos y rechazo del origen externo siguen **NO VERIFICADOS**; no cerrar #78 hasta recibir ambos resultados OPTIONS desde una red con salida completa. La lectura GET no certifica CORS ni producción.
>
> **Límites de seguridad y operación:** no crear endpoints comerciales, middleware de permisos ni mapeos rol→operación antes de aprobación explícita de la matriz. `resolveTenantContext`, `resolveBranchContext` y `resolveOpenCashierRegisterShift` resuelven contexto; no autorizan operaciones. No afirmar auditoría/ledger comercial implementados. Main versiona migraciones 0001–0004, pero 0003/0004 no se han aplicado a Neon main; no ejecutar SQL/migraciones remotas. No cambiar Cloudflare, variables, secretos, DNS, billing, planes ni producción; no interpretar previews como despliegue o certificación productiva. Codex/Claude review independiente de #172 no completada; no afirmar aprobación externa. Producción no está lista para operación comercial.
>
> **Próxima secuencia recomendada:** (1) solicitar al propietario únicamente los status HTTP y headers `Access-Control-*` de los dos preflight OPTIONS de #78, sin cookies/tokens; (2) registrar y evaluar esa evidencia, cerrar #78 solo si satisface el contrato CORS; (3) trabajar con el propietario las decisiones explícitas pendientes de la matriz #53, sin inferir respuestas; (4) después consolidar catálogo de operaciones, scope, auditoría, idempotencia y pruebas cross-tenant/cross-branch en PostgreSQL efímero; (5) recién entonces preparar una PR de implementación acotada. Para el siguiente chat: leer primero `AGENTS.md`, este checkpoint en los seis documentos, la matriz de permisos, `OPERATION_AUTHORIZATION_ARCHITECTURE.md`, `ORGANIZATION_COMMERCIAL_POLICY_CONFIGURATION.md` y `MULTI_BRANCH_DATA_MODEL.md`; contrastar todo con el estado vivo de GitHub antes de continuar.
>
> **Alcance de esta actualización documental:** sincronización de estado únicamente. No se cambió código, esquema, migraciones, workflows, configuración, secretos, datos reales ni infraestructura.

---

> **Estado post-merge PR #172 — 2026-10-30 UTC:** GitHub confirma PR #172 fusionada (merge SHA y HEAD de `main`: `a7fa51d059d35fc679b53de112689a19f37fe967`). HEAD de PR validado: `2301a33810067b99ed9b8bd4e74105e65beff701`. En ese HEAD: 12 check-runs; 11 success y `Cloudflare Pages` seguía `in_progress` en la última consulta. Los seis checks requeridos por protección de `main` estaban completed/success; cero checks fallidos. PR #172 era exclusivamente documental (7 archivos, 413 adiciones, 0 eliminaciones), mergeable y autorizada por el propietario tras revisión manual y CI. Reviews formales: 0; threads inline sin resolver: 0. Codex no completó por límite de uso; revisión independiente Claude/Codex queda pendiente y no se considera aprobada. La preview Cloudflare no es certificación de producción. La matriz `docs/sdd/role-permission-decision-matrix.md` continúa **NO APROBADA**. El merge no autoriza permisos comerciales, endpoints, middleware, migraciones ni cambios de producción. Issues #53 y #78 siguen abiertas.

> **Revisión pre-merge — 2026-10-30 UTC:** PR #172, HEAD previo `6ade1ed1daad8a50b34eb6fd33c5767255d3aa93`, base `main` en `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. GitHub reportó 12/12 check-runs completados con éxito; los seis checks requeridos por protección de `main` están incluidos y verdes. Diff documental: 7 archivos; sin runtime, esquema, migraciones, workflows, secretos, datos ni infraestructura. Revisión manual del alcance y del contenido realizada; no hay reviews formales ni threads inline. La revisión Codex no pudo completarse por límite de uso, por lo que **no se considera aprobada**. Se deja pendiente una revisión independiente por Claude o Codex cuando vuelva a estar disponible; esa revisión futura debe registrar hallazgos y correcciones, pero no invalida esta decisión de fusionar el cambio documental con revisión manual y CI verde. La matriz comercial sigue **NO APROBADA**; este merge no autoriza endpoints ni permisos comerciales. Consultar GitHub en vivo antes de cualquier acción posterior, porque el siguiente commit generará un HEAD nuevo y requerirá sus propios checks.

> **Snapshot de revisión GitHub — 2026-10-30 UTC:** `main` = `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. Antes de esta sincronización, PR #172 estaba abierta y lista para revisión, con HEAD `785d4a912baf6787eafa6d2a7f51e37697f22de4`; en ese SHA se observaron 9/11 check-runs success y 2 in progress (`verify` y `Chromium authentication smoke tests`), sin fallos. No había reviews formales ni threads inline. **Este snapshot es histórico y no identifica el HEAD de la rama después de esta edición**: consultar siempre [PR #172](https://github.com/BTF14/Micro-app/pull/172) y los checks del SHA vivo antes de actuar. Pages/Workers son previews, no certificación de producción. Issues #53 y #78 abiertas; matriz comercial **NO APROBADA**. No se modificaron `main`, Neon main, datos reales, secretos, DNS, billing ni configuración de producción.
# Handoff operativo — continuar autorización server-side — 2026-10-30 UTC

> **Instrucción para el siguiente chat:** no reiniciar el proyecto ni repetir trabajo completado. Leer esta portada y el checkpoint; después consultar GitHub en vivo antes de escribir.

## Punto exacto de reanudación

- Repo: `BTF14/Micro-app`.
- Main conocido: `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. Consultar el ref vivo; no asumir que sigue igual.
- Último merge runtime: PR #169, `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`.
- PR #170 y #171: solo documentación/continuidad, fusionadas.
- PR activa: [#172 — server-side operation authorization architecture](https://github.com/BTF14/Micro-app/pull/172), abierta, no fusionada, base main. Rama `docs/operation-authorization-architecture-20261030`; consultar estado draft/ready y HEAD vivo.
- Último checkpoint previamente validado: `87de879b021cd4b68ce4267b138832279d4a043a` (12/12 checks success). Los commits documentales posteriores requieren validación propia; no reutilizar checks de un SHA anterior.
- Matriz `docs/sdd/role-permission-decision-matrix.md`: **NO APROBADA**. No asumir permisos desde los nombres owner/admin/cashier/inventory.
- Issues #53 y #78: abiertas al último chequeo previo; consultar estado actual.
- No hay handlers/endpoints comerciales. Los helpers de tenant, branch y turno no autorizan operaciones.
- Neon main no se tocó; no se aplicaron 0003/0004 remotamente. No cambiar secretos, DNS, billing, Cloudflare settings ni producción.

## Qué se hizo en esta continuación

1. Se revalidó `main` y PR #172 directamente en GitHub.
2. Se verificó el documento técnico contra el contrato tenant, resolvers de contexto, helper de turno, DB transaction helper y documentación API existente.
3. Se añadió `docs/sdd/OPERATION_AUTHORIZATION_ARCHITECTURE.md` con límites explícitos: autenticación ≠ tenant membership ≠ resource scope ≠ operación autorizada.
4. Se reforzó el texto para requerir revalidación de sesión dentro de la transacción y protección frente a revocaciones concurrentes/TOCTOU; no asumir columnas de versión que aún no existen.
5. Se abrió PR #172 como draft, no fusionada. No se tocó runtime, esquema, migraciones ni infraestructura.
6. En HEAD `87de879b021cd4b68ce4267b138832279d4a043a`, GitHub reportó 12/12 check-runs completed/success; corresponde a ese SHA histórico, no a commits posteriores.

## Orden recomendado desde aquí

1. Consultar `main`, PR #172, diff completo, reviews/threads y checks exactos del HEAD vivo.
2. Antes de fusionar, confirmar que el HEAD vivo tiene los seis checks requeridos verdes y que no hay feedback pendiente. La matriz comercial no queda aprobada por fusionar esta propuesta.
3. No programar permisos por rol hasta aprobación explícita de la matriz.
4. Cuando el propietario apruebe decisiones, cerrar catálogo de operaciones, scope por recurso y reglas sensibles.
5. Diseñar auditoría (evento, actor, scope, operación, motivo, aprobador, idempotency/correlation, retención/immutabilidad) sin afirmar que ya existe.
6. Diseñar autorización dentro de la misma transacción de cada mutación, con sesión/membresía/rol/assignment revalidados y locks/isolation definidos por invariantes.
7. Diseñar ledger de caja e inventario antes de ventas/pagos/ajustes/reversos.
8. Implementar una sola vertical slice, con pruebas PostgreSQL efímeras reales de handler, denegación sin side effects, cross-tenant/branch, revocación concurrente, rollback e idempotencia.

## Gates que no se deben saltar

- No inferir permisos comerciales de roles, sucursal asignada, turno abierto o configuración comercial.
- No habilitar descuentos, anulaciones, devoluciones, cambios de precio, cierres ajenos ni aprobaciones sin decisión explícita.
- No crear endpoints comerciales antes de autorización por operación y pruebas end-to-end.
- No aplicar 0003/0004 a Neon main ni ejecutar SQL en producción desde esta tarea.
- No declarar Cloudflare preview como producción validada.
- No afirmar que auditoría/ledger ya existen.
- No volver a repetir auditorías previas o reconstruir helper de turno ya fusionado.

## Archivos de continuidad a leer

`AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/WORK_CHECKPOINT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/API_INTEGRATION.md`, `docs/sdd/OPERATION_AUTHORIZATION_ARCHITECTURE.md` y `docs/sdd/role-permission-decision-matrix.md`.

---

# Handoff operativo — post PR #169 — 2026-10-30 UTC

## Punto de reanudación verificado

- Repositorio: `BTF14/Micro-app`.
- Último merge con cambios de runtime: PR #169, SHA `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`. PR #170 (`af08cd913a4e0e155b1b74183a71efc51e5d4646`) fue documental. Consultar el SHA vivo de `main` antes de cualquier cambio.
- PR #169 fusionada; head revisado `0c437509c0ad1a02b91c08d03d9dba62f0e9bd78`.
- PR #166–#170 fusionadas; #170 sincronizó el estado documental posterior a #169. No hay PR de código abierta.
- Post-merge en el SHA real de main: 7/7 workflows Actions success y Cloudflare Pages/Workers 2/2 success. CI confirma 7/7 tests del nuevo helper en PostgreSQL 18 desechable, además de build/typecheck y suites existentes.
- Reviews formales/threads GitHub: 0. Codex review agotó cuota; revisión manual fallback, no aprobación externa.
- Issues #53 y #78 siguen abiertos. No se modificaron.
- Migraciones 0001–0004 están en Git; 0003/0004 no aplicadas a Neon main.

## Lectura obligatoria antes de otro cambio

Seguir AGENTS.md y volver a leer: README, CURRENT_STATE, HANDOFF_NEXT_CHAT, WORK_CHECKPOINT, PROJECT_PLAN, STATE_JOURNAL, AI_COLLABORATION_AND_PR_POLICY, CONSTITUTION, DATABASE_SCHEMA, SCHEMA_REVIEW, SAAS_ARCHITECTURE_DECISIONS, SDD/MULTI_BRANCH_DATA_MODEL, SDD/REGISTER_SHIFT_MODEL, SDD/role-permission-decision-matrix.md y el skill PostgreSQL. Para mutaciones DB, leer BACKUP_AND_RECOVERY.

## Helper fusionado

- Archivo: `apps/api/src/cashier-open-shift.ts`.
- Función: `resolveOpenCashierRegisterShift(client, branchContext)`.
- El contexto debe proceder de `resolveBranchContext` tras `resolveTenantContext`; no construirlo desde request data.
- Exige role `cashier`; revalida org/branch/register/user/membership/role/assignment activos; filtra org/user/branch/open shift.
- Retorna null si no existe turno o el scope no es válido.
- `FOR SHARE OF s` mantiene el turno estable frente a cierre concurrente si el caller comparte la transacción. El helper no crea una transacción.
- Pruebas unitarias y 7 integraciones PG18 pasan. No hay endpoints comerciales ni permisos de operación implementados.

## Próximo trabajo

1. Obtener aprobación del propietario de la matriz de permisos por rol, organización y sucursal.
2. Diseñar autorización server-side por operación (incluidos actor, scope, permisos y auditoría) antes de crear handlers.
3. Solo después diseñar endpoints y pruebas transaccionales de ventas/pagos/inventario/caja.
4. Mantener pruebas PostgreSQL 18 desechables; no usar Neon main.

## Restricciones

- No endpoints comerciales antes de aprobación de permisos y diseño de autorización.
- No asumir que owner/admin pueden operar como cajero.
- No Neon main, migraciones remotas, datos reales, secretos, DNS, billing ni Cloudflare settings.
- Coste $0; no depender de Codex mientras su cuota esté agotada.
- No pedir autorización de merge de nuevo; fusionar PR futuras cuando todos los gates estén completos.

---

# Reanudación inmediata — 2026-10-30 UTC, post PR #161

**Leer primero:** [docs/WORK_CHECKPOINT.md](WORK_CHECKPOINT.md), [docs/CURRENT_STATE.md](CURRENT_STATE.md), [AGENTS.md](../AGENTS.md) y la política de colaboración.

- PR #160 y PR #161 están fusionadas. Merge #160: `be6f19486caf5cf3605c6ca6615f87e305822ea7`; merge #161: `c7abcb477afd649161176aad8cae707f5e42f632`.
- La sincronización de continuidad está integrada. No abrir otra PR solo para repetir estos checkpoints; a partir de ahora, actualizar checkpoint y journal dentro de la PR de trabajo que corresponda.
- Los 12 checks del HEAD PR #161 `a17a4b95312876f0bf4b201c6a84a323fb69fa3b` terminaron success. No equivalen a un run post-merge separado.
- Codex review falló por cuota; se realizó revisión manual fallback. Protección de rama no revalidada (HTTP 403).
- **Siguiente trabajo técnico:** cerrar arquitectura antes de endpoints comerciales. La matriz de permisos por rol/sucursal sigue sin aprobación explícita; no implementar permisos de negocio basados en la propuesta de IA.
- API: auth/health solamente; no hay handlers comerciales. `resolveTenantContext` valida sesión/membresía/organización, no permisos por operación ni sucursal y no está conectado a handlers.
- `auth_rate_limits` existe en DDL pero no tiene caller runtime.
- Esquema: stock por organización; faltan sucursales, almacenes, cajas/turnos; faltan reconciliación venta-líneas-pagos, idempotencia de pagos, consistencia stock-ledger, guard del último owner y auditoría append-only.
- `feat/neon-transaction-adapter` corresponde a PR #1 ya fusionada; rama 14 ahead/245 behind. No reabrir ni fusionar.
- No tocar Neon main, secretos, datos reales, billing, DNS ni producción. No ejecutar migraciones ni desplegar producción sin gates.

---

## Handoff histórico previo a PR #161


**Leer primero:** [docs/WORK_CHECKPOINT.md](WORK_CHECKPOINT.md), después [docs/CURRENT_STATE.md](CURRENT_STATE.md), [AGENTS.md](../AGENTS.md) y la política de colaboración.

- PR #160 está fusionada en `main`; merge commit `be6f19486caf5cf3605c6ca6615f87e305822ea7`. No reabrirla ni duplicar su trabajo.
- Los 12 checks del HEAD PR `fcb4269a459831be7858358c56e90346d5e4e9a6` terminaron en success. Esos checks cubren el HEAD de PR, no son una ejecución post-merge sobre el squash commit.
- Codex review no se completó por cuota. Se realizó revisión manual del diff y no quedaron hallazgos materiales.
- La protección de rama no se pudo revalidar por HTTP 403; no asumir que sigue configurada como en la lectura histórica del 26 oct.
- **Siguiente trabajo técnico:** completar diseño de arquitectura antes de handlers comerciales. La matriz de permisos por rol sigue sin aprobación explícita del propietario; no implementar permisos comerciales a partir de la propuesta de IA.
- Inventario verificado: API solo registra auth/health; no hay handlers comerciales. `resolveTenantContext` valida sesión/membresía/organización pero no permisos por operación ni sucursal y no aparece conectado a handlers. `auth_rate_limits` existe en DDL pero no tiene caller runtime.
- Esquema inicial: stock por organización; faltan sucursales, almacenes, cajas y turnos; faltan reconciliación venta-líneas-pagos, idempotencia propia de pagos, vínculo fuerte entre saldo y ledger, guard del último owner y política append-only de auditoría.
- La rama `feat/neon-transaction-adapter` pertenece a PR #1 ya fusionada; está 14 commits ahead/245 behind de main. No reabrir ni fusionar; el código vigente está en main.
- No tocar Neon main, secretos, datos reales, billing, DNS ni producción. No ejecutar migraciones ni desplegar producción sin superar los gates de AGENTS/CONSTITUTION.
- Documentar cada bloque significativo durante el trabajo; actualizar WORK_CHECKPOINT y STATE_JOURNAL antes de cambiar de área o cerrar el chat.

---

## Handoff histórico previo a la fusión de PR #160


**Leer primero:** [docs/WORK_CHECKPOINT.md](WORK_CHECKPOINT.md), después [docs/CURRENT_STATE.md](CURRENT_STATE.md).

- PR #160 está abierta, no draft, no fusionada. Último SHA verificado antes de esta actualización: `be9475d85e1739e3ea5fecabf69ac0104928fa98` (WORK_CHECKPOINT actualizado; CURRENT_STATE/HANDOFF/PROJECT_PLAN/STATE_JOURNAL pueden mover el HEAD después).
- En el HEAD previo `bcc667fc6ccd154b8e4f93f041e33d16c29195f0`, CI workflow `41002801690` estaba pending; siete workflows adicionales terminaron success. No declarar CI completo ni reutilizar resultados para un SHA posterior.
- Codex review agotó cuota en un SHA anterior. No es aprobación. No depender de Codex.
- **Siguiente paso inmediato:** consultar el HEAD vivo de PR #160, consultar workflows de ese SHA, completar revisión manual del diff final y mantener abierta la PR mientras cualquier check requerido esté pendiente/no verificado.
- **Después:** si todo pasa y no hay hallazgos materiales, fusionar #160 con squash, verificar main y registrar merge. La autorización general del propietario permite fusionar cuando se cumplan los gates.
- Continuar auditoría de arquitectura/API/esquema; revisar `feat/neon-transaction-adapter` sin merge ciego. Priorizar autorización por operación, aislamiento organización/sucursal, idempotencia, consistencia transaccional y rate limiting antes de endpoints comerciales.
- No modificar Neon main, secretos, datos reales, billing, DNS ni producción; no desplegar manualmente ni incurrir en costes.

---

# Reanudación inmediata — 2026-10-30 UTC

**Punto de entrada obligatorio:** [docs/WORK_CHECKPOINT.md](WORK_CHECKPOINT.md).

- PR activa: [#160](https://github.com/BTF14/Micro-app/pull/160), rama `docs/continuity-post-158-159-20261030`, abierta, no draft y no fusionada; HEAD verificado `0e6c27bac8a9ef1a9d80da109a136c34aec99a9a`, base `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc`; 14 commits y 8 archivos. Workflow runs y combined status devolvieron listas vacías para ese SHA: CI pendiente de verificación.
- La revisión automática de Codex quedó incompleta por cuota agotada; no tratarla como aprobación. Ver comentarios enlazados en WORK_CHECKPOINT.
- Se añadió a la misma PR la política de checkpoints incrementales en `docs/AI_COLLABORATION_AND_PR_POLICY.md` y se creó `docs/WORK_CHECKPOINT.md`. No abrir otra PR para este objetivo.
- **Primero:** verificar SHA actual y leer WORK_CHECKPOINT; completar sincronización de CURRENT_STATE/HANDOFF/STATE_JOURNAL; comprobar checks del SHA exacto; revisar manualmente el diff completo de PR #160.
- **Después:** continuar la prioridad técnica del estado vivo: cerrar auditoría de arquitectura/API/esquema y brechas P0; revisar `feat/neon-transaction-adapter` sin merge ciego; diseñar autorización por operación y aislamiento organización/sucursal antes de rutas comerciales.
- No repetir tareas ya verificadas ni afirmar pruebas que no se ejecutaron. No merge, producción, Neon main, secretos, DNS, billing ni cambios de infraestructura sin los gates/consentimientos aplicables.

---

# Estado vivo verificado — 2026-10-30 UTC

- **Fuente viva:** GitHub confirma `main` en `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc`. PR #158 y #159 están fusionadas; PR #160 está abierta. La protección de rama de GitHub no se pudo confirmar por API y no debe afirmarse como verificada.
- **PR #158:** merge commit `3fba9870b69a7e1ef05cc20db6d19f3ee18df51d`; auditoría documental de Cloudflare/workflows/continuidad.
- **PR #159:** merge commit `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc`; fija Node.js `24.22.2` mediante `.node-version` y pnpm `10.34.9` mediante `packageManager`, con alineación en workflows.
- **Checks del SHA exacto de main:** 9/9 completed/success, incluidos Workers Build, Cloudflare Pages, Chromium smoke, verify, secret-history scan, postgres-migration, Trivy, generate-progress y static analysis. No extrapolar estos checks a commits futuros.
- **Producción observada tras merge:** Pages `https://micro-app-63i.pages.dev` cargó la pantalla de acceso; Worker `https://micro-app-api.btfcasheb.workers.dev/health` respondió HTTP 200 con `status=ok`, `service=micro-app-api`, `stage=scaffold`. Es una comprobación básica, no una certificación funcional/comercial.
- **Neon, lectura de metadatos:** proyecto `micro-app-db`, plan `free_v3`, PostgreSQL 18, región `aws-us-east-1`; periodo de consumo mostrado 2026-10-17 a 2026-11-01. Tamaño lógico de main: 32,866,304 bytes (~31.34 MiB). Consumo del periodo: 5,645,769 bytes transferencia; 5,911 segundos compute; 23,240 segundos activo; 0 bytes escritos reportados. Ramas: 3/10; main 32.87 MB, restore-test ~33.57 MB, integrity-test ~31.69 MB. Son metadatos/contadores del proveedor, no benchmark ni capacidad SaaS.
- **Seguridad Neon:** metadatos actuales muestran `main.protected=false`, `allowed_ips.ips=[]`, `protected_branches_only=false`, `block_public_connections=false`; ramas listadas sin protección. No cambiar estos ajustes sin evaluación/plan y autorización correspondiente. No se leyó SQL, secretos, roles ni datos.
- **Protocolo README:** PR #159 ya cambió toolchain de forma concreta y verificada; README debe reflejar Node/pnpm exactos. Este checkpoint actualiza el README y continuidad para no dejar instrucciones contradictorias.
- **Guardrails vigentes:** no SQL ni cambios en Neon main; no secretos, datos reales, billing, DNS ni ajustes Cloudflare; no merge/deploy de producción sin aceptación explícita. Objetivo $0. No depender de Codex.
- **Siguiente prioridad:** cerrar lectura documental de arquitectura/API/esquema e inventariar brechas P0; revisar rama `feat/neon-transaction-adapter` con diff completo antes de rescatar nada; después diseñar tenant/branch authorization y rate limiting antes de endpoints comerciales. No prometer número de organizaciones hasta pruebas sintéticas.
- **Nota histórica:** los bloques inferiores que digan #158/#159 “abiertas”, “draft” o “no mergeadas” son históricos y quedan supersedidos por este estado vivo y por GitHub.

---

## Instrucción de continuidad para la siguiente IA

Continúa Micro app desde el estado vivo de este documento, no desde los snapshots históricos inferiores. Primero vuelve a verificar main, PRs y checks exactos. Lee `AGENTS.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/CONSTITUTION.md`, `docs/PROJECT_PLAN.md`, `docs/SECURITY_ROADMAP.md`, `docs/CAPACITY_AND_LIMITS.md`, `docs/SAAS_ARCHITECTURE_DECISIONS.md` y `docs/SCHEMA_REVIEW.md`. Sigue el orden de inicio de AGENTS.md y el protocolo README. No dependas de Codex. No crees PRs de relleno. No toques Neon main, secretos, datos reales, billing, DNS ni producción. Haz auditoría estática y pruebas aisladas; distingue implementado, probado, desplegado y pendiente. Revisa `feat/neon-transaction-adapter` sin merge ciego. Antes de habilitar rutas comerciales, resuelve autorización por operación, aislamiento organización/sucursal, abuso/rate limiting y consistencia transaccional. Documenta SHA, comandos, checks y limitaciones. README solo se actualiza para avances concretos verificados.

---

# Checkpoint continuidad — 2026-10-30 UTC (Node/pnpm corregidos en PR #159)

- **PR #158** (documentación Cloudflare/CI): https://github.com/BTF14/Micro-app/pull/158. Rama docs/workflow-deployment-audit-20261030; abierta, draft, no mergeada. HEAD conocido antes de este checkpoint: 162765fac25bf3aa623a41676d56e570afabd7fd; 12/12 checks success.
- **PR #159** (pinning de toolchain): https://github.com/BTF14/Micro-app/pull/159. Rama fix/cloudflare-node-pnpm-pinning-20261030; abierta, draft, no mergeada. HEAD 57de704c03fffebfd9aee2ae91c05a0e3af7515a; 13/13 checks success.
- PR #159 añade .node-version = 24.22.2, packageManager = pnpm@10.34.9 y alinea node-version-file/pnpm exactos en CI, Playwright, AutoSkills preview, Daily Dependency Watch y Regenerate Lockfile.
- Cloudflare Pages build log del SHA 57de704 confirmó Node 24.22.2 + pnpm 10.34.9, build exitoso, sin Unsupported Engine warning; preview https://70046713.micro-app-63i.pages.dev. No se fusionó ni se desplegó producción.
- Mantener PRs separadas: #158 solo docs; #159 solo toolchain/workflows. No fusionar ninguna sin autorización explícita porque push/merge a main activa despliegues externos.
- No cambiar Cloudflare settings, Neon main, secretos, DNS, billing, datos reales ni producción. Objetivo USD 0. Sin Codex.

---

# Checkpoint final — 2026-10-30 UTC (PR #158 HEAD 5b1b573)

- **PR #158:** abierta, draft, no fusionada; base main = 1ee1808af4aae484a71dc24750237ff4f4d934a0.
- **HEAD actual:** 5b1b5734f3fa8024f060694e5dbc5f5f9f8ab766; cinco archivos de documentación, cinco commits, sin cambios de aplicación/workflows/migraciones.
- **Checks del SHA exacto:** 12/12 success (GitHub Actions y Cloudflare). Cloudflare Pages preview: https://d8477e48.micro-app-63i.pages.dev. Workers preview: https://2935f95a-micro-app-api.btfcasheb.workers.dev. Son previews, no producción.
- **Pages Settings:** main producción; root vacío; build corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build; output apps/web/dist; build system v3; cache off; monitoring *; preview público por defecto; sin dominio custom. Detalles completos en docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md.
- **Preview isolation:** verificado en código main: API base vacía, llamadas API bloqueadas, login deshabilitado, CSP sin API en previews; _headers define CSP/seguridad para producción. Mantener pruebas de regresión.
- **Pendientes:** revisar build logs para versión efectiva Node/pnpm; evaluar pin pnpm, build cache y semántica “Fail open” sin cambiar ahora; verificar headers HTTP efectivos; revisar cuota Pages; confirmar required checks/branch protection (no confirmado).
- **Guardrails:** no merge/deploy sin permiso explícito; no tocar Cloudflare settings, Neon main, secretos, datos reales, billing ni DNS. Objetivo USD 0. No Codex.

---

## Checkpoint Pages Settings — 2026-10-30 UTC

- TinyFish accedió a Settings de Pages `micro-app`, solo lectura. Production branch `main`; root directory vacío; build command `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build`; output `apps/web/dist`; build system v3; cache off; monitoring routes `*`; automatic deploys on; no deploy hooks; build comments on; preview access public by default; no custom domains; vars names only: `CLOUDFLARE_INCLUDE_PROCESS_ENV`, `VITE_API_BASE_URL`.
- Compatibility date `2026-10-17`; flags panel mostró True; Functions setting mostró `Fail open` (no interpretar/cambiar sin confirmar).
- Repo main confirma monorepo pnpm `apps/*`; root package requiere Node `>=24.22.2 <25` pero no fija `packageManager`. Pendiente verificar Node/pnpm efectivos en build logs; evaluar pinning en PR separada.
- Build command compila web vía `apps/web/package.json` script `tsc -b && vite build && node scripts/postbuild.mjs`; API se valida en workflows separados.
- `apps/web/public/_headers` existe: nosniff, DENY, Referrer-Policy, Permissions-Policy, HSTS, CSP. CSP prod permite API Worker. Postbuild quita Worker de CSP en preview; Vite deja API base vacía y activa preview flag; auth.ts bloquea API y App.tsx deshabilita login y muestra aviso. Preview público por defecto, pero aislamiento API está implementado en main auditada. Mantener tests de regresión.
- `_redirects` no existe en `apps/web/public/`; UI no mostró configuración de redirects/headers.
- Cache deshabilitado puede consumir más build time; medir antes de cambiar. Pages usage/billing no consultados.
- Sin cambios en configuración/infra/secretos/builds/producción. PR #158 sigue draft y no fusionada.

# Handoff prioritario — 2026-10-30 UTC (Pages audit y continuidad)

- Repo `BTF14/Micro-app`; PR #158 abierta/draft: https://github.com/BTF14/Micro-app/pull/158. Rama `docs/workflow-deployment-audit-20261030`. No mergear.
- Corregir auditoría CI: duplicación general potencial solo `secret-history-scan.yml` (push ** todas las ramas) y `security-scan.yml` (push sin filtro). Los demás workflows restringen ramas/paths o son manuales/programados. Ver `docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md`.
- Cloudflare Workers Free $0: 100k req/día, 10ms CPU/req, 3.000 build minutes/mes, 100 Workers, 5 Cron triggers. Worker `micro-app-api`: main producción; docs branches previews. PR #158 preview Worker successful.
- Cloudflare Pages `micro-app`: producción branch `main`, auto deploy push main. Último deploy prod observado activo: commit `1ee1808af4aae484a71dc24750237ff4f4d934a0`, URL `https://06553c7b.micro-app-63i.pages.dev`; primary `https://micro-app-63i.pages.dev`. PR #158 commit `79be208` preview successful `https://945ae93c.micro-app-63i.pages.dev`; `d3f056b` preview `https://70fea194.micro-app-63i.pages.dev`. No confundir previews con producción.
- Pages mostró 15 deployments recientes (1 prod + 14 previews), 1.100 total en historial; todos los 15 visibles success. No implica historial completo sin fallos.
- Settings de Pages no cargó: build command, output dir, root dir, framework, env, Functions, redirects, headers y uso/cuotas no disponibles. No inventar.
- No custom domain visible. Push/merge a main despliega producción. Merge y deploy separados; no autorizar deploy por inferencia.
- Rulesets API vacío, legacy branch protection 403; protección/contextos requeridos no confirmados.
- Sin Codex; no Neon main/SQL remoto; no secretos/datos reales; no billing/upgrade; no cambios Cloudflare/DNS/tráfico. Objetivo $0. Capacidad multi-tenant no medida.

## Próximos pasos
1. Completar Settings Pages read-only.
2. Confirmar required checks y evaluar los dos triggers push amplios.
3. Revisar PR #158 diff/checks SHA exacto, mantener draft.
4. Continuar arquitectura y pruebas sintéticas aisladas.

---

# Handoff prioritario — 2026-10-30 UTC (Cloudflare y corrección de auditoría CI/CD)

> Continuar el mismo proyecto. Este checkpoint corrige explícitamente una conclusión equivocada de la auditoría anterior.

- **Repositorio:** `BTF14/Micro-app`.
- **PR #158:** https://github.com/BTF14/Micro-app/pull/158 — abierta, draft, documental; mantener sin merge hasta autorización explícita de producción.
- **Rama PR:** `docs/workflow-deployment-audit-20261030`. HEAD observado antes de actualizar: `d3f056b780ddad62deb5c1e1c0f1679bba19bb50`; base `main` = `1ee1808af4aae484a71dc24750237ff4f4d934a0`.
- **Corrección CI:** no son siete workflows sin filtros. Solo `secret-history-scan.yml` (push todas las ramas) y `security-scan.yml` (push sin filtro) tienen potencial duplicación general con PR. CI/Playwright/Semgrep restringen push a main; migration-check y project-progress usan ramas explícitas; otros workflows tienen filtros paths/branch. Leer siempre `docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md`.
- **Cloudflare Workers Free:** $0/mes; cuotas observadas: 100k requests/día, 10 ms CPU/request, 3.000 build minutes/mes, 100 Workers, 5 cron triggers. Snapshot: 183 requests, 0 errores, 106,68 build minutes últimas 24 h; Worker view también 85 invocaciones y P90 CPU 10 ms. No usar esto como benchmark.
- **Worker:** `micro-app-api` en workers.dev. `main` es producción observada; ramas docs son previews. PR #158 obtuvo previews exitosos de Worker y Pages confirmados por comentarios automáticos de Cloudflare; no producción.
- **Pages:** proyecto `micro-app`, URL `https://micro-app-63i.pages.dev/`; conectado a BTF14/Micro-app. Preview de PR #158 successful. Historial de versiones productivas, build settings y consumo Pages todavía no extraídos.
- **Logs/Traces:** aparecían desactivados; evaluar seguridad/coste antes de activarlos.
- **No confirmados:** usage restante, billing detallado, Pages deployment history/production branch, branch protection y contexts requeridos (rulesets vacío; legacy endpoint 403).
- **No Codex. No Neon main ni SQL remoto. No secretos ni datos reales. No pagos. No tocar Cloudflare/DNS/tráfico. No merge ni deploy sin permiso explícito. Producción no lista y capacidad SaaS no medida.**

## Secuencia de continuación
1. Completar Pages read-only: producción branch, root/build command, previews, versiones y Analytics/usage.
2. Confirmar checks requeridos en GitHub si la conexión permite leer branch protection; no asumir ausencia por 403.
3. Proponer optimización focalizada de los dos workflows con push amplio, solo si preserva los checks requeridos.
4. Actualizar PR #158 y ejecutar revisión manual de diff/checks exactos. Mantener draft.
5. Seguir con arquitectura org → branch → warehouse/register/shift, autorización, integridad transaccional y pruebas aisladas.

---

# Handoff prioritario — 2026-10-30 UTC (post PR #157)

> Este bloque prevalece sobre notas inferiores. Continuar el mismo proyecto y verificar el estado vivo antes de actuar.

- **Repositorio:** `BTF14/Micro-app`; **main:** `1ee1808af4aae484a71dc24750237ff4f4d934a0`.
- **PR #157:** cerrada y fusionada. Merge SHA = main. HEAD `6eb464c950f195ec67350977575aef77e9790e1d`; ocho workflow runs recuperados para ese HEAD y los ocho success. No hay evidencia recuperada de CI post-merge; no afirmar que existió.
- **PRs abierta:** [PR #158](https://github.com/BTF14/Micro-app/pull/158), documental y en borrador. No fusionar.
- **Auditoría:** leer [WORKFLOW_AND_DEPLOYMENT_AUDIT.md](WORKFLOW_AND_DEPLOYMENT_AUDIT.md). No hay deploy de Cloudflare en GitHub Actions; los builds históricos de Pages/Workers parecen provenir de Git integration externa. No se puede inspeccionar el dashboard con las conexiones disponibles.
- **Peligro de merge:** push a `main` puede activar producción por integración externa. No fusionar sin autorización explícita de producción, aunque el cambio sea documental.
- **CI:** siete workflows usan ambos eventos `push` y `pull_request` sin filtros; un commit a rama con PR puede duplicar validaciones. `sdd-docs-validation` sí limita ramas y paths. Primero revisar branch protection/rulesets, luego proponer una sola optimización coherente.
- **Producto:** API auth/health únicamente; sin endpoints comerciales; tenant context no autoriza operaciones ni branch scope; esquema sin sucursales/almacenes/cajas/turnos; matriz de permisos NO aprobada; capacidad sin medir.
- **Restricciones:** no depender de Codex; no tocar Neon `main`, secretos, datos reales ni producción; no ejecutar SQL remoto; no activar servicios pagos; objetivo USD 0.

## Secuencia

1. Revisar branch protection/rulesets y los contexts obligatorios en GitHub.
2. Verificar en Cloudflare, solo lectura, Git integration, ramas de deploy, build settings y estado real de Pages/Workers.
3. Reducir duplicación CI sin eliminar checks requeridos ni aplicar paths filters sin mapa de dependencias.
4. Continuar inventario de queries/callers y ERD multi-sucursal.
5. Preparar decisiones de roles sensibles para aprobación del propietario; no implementarlas por inferencia.
6. Mantener CURRENT_STATE, PROJECT_PLAN, STATE_JOURNAL, README y este handoff alineados.

---

# Handoff prioritario — 2026-10-30 UTC

> Fuente de verdad: repositorio `BTF14/Micro-app`. Leer primero `AGENTS.md`, `docs/CURRENT_STATE.md` y `docs/AI_COLLABORATION_AND_PR_POLICY.md`. No depender de Codex: está fuera de disponibilidad por tiempo indefinido y el trabajo debe continuar con revisión manual, tests y GitHub Actions.

- **Main:** `18961456ac535146c4a1687d3b07d8f6693ce141`, merge de PR #156.
- **PR #156:** cerrada y fusionada. HEAD de PR `6c068f3e9734736ac26e51ff754e39915d660abe`; 9/9 workflows success en ese SHA. No hubo review formal ni threads; diff revisado manualmente. No se comprobó un nuevo workflow post-merge del merge SHA.
- **PRs abiertas al último chequeo:** ninguna. Volver a consultar en vivo.
- **PR #157 abierta:** `docs/post-pr156-audit-continuity-20261030`; consolida CURRENT_STATE, HANDOFF, PROJECT_PLAN, STATE_JOURNAL, SCHEMA_REVIEW, DATABASE_SCHEMA, API_INTEGRATION, SECURITY_ROADMAP y la matriz de roles. Comprobar el SHA vivo, revisar diff y exigir todos los checks obligatorios antes de fusionar.
- **API:** rutas existentes: auth register/login (ambas fail-closed), me/logout, Google OAuth GET/POST bootstrap/callback, y health. No existen endpoints comerciales HTTP.
- **Tenant context:** valida sesión/membresía/organización activas, pero no aplica autorización por operación ni sucursal; la búsqueda de callsites no encontró handlers que invoquen el helper. `withDatabaseTransaction` solo tiene uso actual en el bootstrap Google, no en operaciones comerciales.
- **Esquema actual:** organización/membresía y entidades comerciales iniciales con FK tenant-scoped; no hay sucursales, almacenes, cajas/turnos, compras/recepciones, devoluciones ni transferencias. Stock por organización. La migración inicial no está aplicada a Neon main.
- **Hallazgos SQL pendientes:** reconciliación venta-líneas-pagos; consistencia stock-ledger; referencias polimórficas de movimientos; idempotencia de pagos; regla del último owner; índices y consultas a validar con datos sintéticos.
- **Matriz de roles:** sigue NO aprobada. Cajero/inventario no deben obtener acceso global; requieren asignación de sucursal, y caja/turno para operaciones de caja. La gestión de allowlist es privilegio de plataforma separado de `owner/admin` de tenant; falta definir identidad/recuperación del operador.
- **Rate limiting:** `auth_rate_limits` solo existe en el DDL; no se encontraron funciones ni callers en runtime. Verificar si Cloudflare aplica límites de cuenta y diseñar control distribuido antes de ampliar acceso OAuth/bootstrap.
- **Capacidad SaaS:** sin medir; no prometer empresas/locales concurrentes. Objetivo de coste USD 0.
- **No usar Codex, no esperar a Codex.** Revisión manual del diff completo + pruebas + workflows; si una herramienta de IA revisora no está disponible, documentar limitación sin convertirla en bloqueo artificial.
- **No producción, no Neon main, no secretos, no datos reales, no billing.**

## Secuencia de continuación

1. Verificar rama principal, PRs abiertas, PR #156 fusionada y workflows del SHA actual.
2. Completar el inventario de queries SQL y el mapa de llamadas de auth/tenant; agregar rutas y tests concretos al contrato de autorización.
3. Completar ERD organizacional y operacional sin ejecutar migraciones.
4. Preparar decisión de roles y permisos sensibles para aprobación del propietario; no inferir porcentajes ni excepciones.
5. Diseñar esquema v2 y migraciones solo después del ERD; probar desde base vacía y upgrade en PostgreSQL desechable.
6. Diseñar pruebas negativas cross-tenant/cross-branch, transacción, idempotencia y concurrencia.
7. No reabrir `feat/neon-transaction-adapter`: su PR #1 ya se fusionó el 2026-10-17 (merge `b6511d0876e33096f75df2466653449165888821`); la rama está divergida (14 ahead/242 behind). La tarea correcta es revisar la implementación vigente en main y sus callsites, no fusionar la rama histórica.
8. Actualizar README solo tras avances concretos verificados y mantener CURRENT_STATE, PROJECT_PLAN, STATE_JOURNAL y este handoff al día.

## Prompt de continuidad

Continúa el trabajo existente de `BTF14/Micro-app`, no crees un proyecto nuevo. Lee los documentos obligatorios de `AGENTS.md` y verifica GitHub en vivo. No uses ni dependas de Codex. La PR #156 ya está fusionada en main con merge SHA `18961456ac535146c4a1687d3b07d8f6693ce141`; su SHA de PR `6c068f3e9734736ac26e51ff754e39915d660abe` tuvo 9/9 workflows success. Continúa desde el inventario de API/schema/queries y los hallazgos de integridad descritos en CURRENT_STATE y SCHEMA_REVIEW. Trabaja con ramas y una PR coherente, revisa manualmente el diff, exige checks del SHA exacto y documenta todo. No despliegues producción, no toques Neon main, secretos, datos reales ni recursos pagos. No implementes endpoints comerciales ni migraciones hasta cerrar ERD, matriz de permisos y pruebas de aislamiento. Mantén el coste objetivo USD 0.

---

# Handoff prioritario — 2026-10-30

> Leer AGENTS.md, CURRENT_STATE.md y AI_COLLABORATION_AND_PR_POLICY.md. Verificar el estado vivo de GitHub antes de actuar.

- Reutilizar PR [#156](https://github.com/BTF14/Micro-app/pull/156), rama `docs/reconcile-main-after-pr155-20261029`; no abrir otra PR documental.
- Último bloque: README, AGENTS, política, Constitución y SCHEMA_REVIEW reconciliados con el estado actual de auth. Cambios solo documentales.
- Google OAuth + allowlist/bootstrap seguro, state/PKCE, sesión HttpOnly revocable y validación Google `email_verified` implementados según PR #153/#155. Login/registro por contraseña disabled/fail-closed. MFA, recuperación de cuenta/administrativa y limpieza automática de sesiones pendientes.
- API actual sin endpoints comerciales HTTP; solo identidad y health. Sucursales/almacenes/cajas/turnos no están modelados en esquema. SaaS multi-org/multi-sucursal es dirección documentada, no producto implementado.
- Capacidad no medida. Verificar límites de Neon y Cloudflare, hacer pruebas sintéticas y mantener USD 0; no prometer número de empresas/locales.
- README debe actualizarse al cerrar avances concretos y verificados, nunca para presentar propuestas como funcionalidades.
- No producción, secretos, datos reales ni Neon main.

## Próximas acciones
1. Consultar SHA actual de la rama/PR #156, base, estado, diff y workflows exactos.
2. Revisar README contra `apps/api/src/index.ts`, `google-auth.ts`, `auth.ts`, `tenant-context.ts` y `docs/API_INTEGRATION.md`.
3. Obtener revisión independiente solicitada; no autoaprobar ni fusionar.
4. Seguir auditoría read-only de rutas/esquema/constraints/índices/queries; preparar ERD org→sucursal→almacén/caja/turno y reconciliar matriz de permisos. No migraciones/endpoints comerciales antes de gates.

---

# Handoff prioritario — 2026-10-29

> Leer primero este bloque y `AGENTS.md`. Después seguir la política y los documentos canónicos. Las secciones históricas inferiores son contexto, no estado vivo.

- Repo único: `BTF14/Micro-app`; PR documental en curso [#156](https://github.com/BTF14/Micro-app/pull/156); rama `docs/reconcile-main-after-pr155-20261029`.
- PR #156 se debe reutilizar para integrar decisiones de arquitectura y continuidad; no abrir una segunda PR documental solapada.
- Última consulta: PR #156 abierta/mergeable; base `main` SHA `5a9bdc5a18a54c3c68639f52125d913d4e725b91`; 9 archivos modificados; sin reviews ni review threads. El HEAD cambia al actualizar documentos: consultar siempre el SHA vivo. En HEAD observado `a5aced77ffd1a628bb8175b91cbc7305144fb696` se dispararon 8 workflows (1 success, 4 pending/in_progress, 3 queued); esperar y verificar los resultados del HEAD más reciente en GitHub Actions antes de solicitar merge.
- Leer `docs/SAAS_ARCHITECTURE_DECISIONS.md` antes de proponer esquema, API comercial, BCV, búsqueda, caché, roles o cuotas.
- Decisión arquitectónica de dirección: una plataforma multi-organización, multi-sucursal y multiusuario; catálogo compartido por organización, stock por sucursal/almacén, caja/turno por sucursal.
- BCV y buscador siguen NO implementados. Fuente BCV aún debe investigarse; no inventar API. Búsqueda SQL indexada primero; caché de catálogo solo después de medir. KV nunca autoriza ni confirma una venta.
- La matriz de roles sigue pendiente de aprobación y debe reconciliarse con alcance de sucursal/caja. No implementar permisos comerciales basándose en celdas no aprobadas.
- No hay modelo de sucursales/almacenes/cajas ni rutas comerciales HTTP verificadas; stock actual es por organización.
- Capacidad SaaS sin medir. Revisar límites de Neon, Workers, Pages, KV y transferencia; pruebas sintéticas solamente. Presupuesto $0.
- No producción, secretos, datos reales ni Neon `main`. Producción NO lista.

- **Verificación de CI más reciente completa:** HEAD `8c15e13fa001a14a0ddf9f2432bc17efb30d476d` tuvo los 8 workflows requeridos en `success`, incluidos los seis contexts de protección (`verify`, `postgres-migration`, Chromium authentication smoke tests, JavaScript/TypeScript static analysis, Trivy y secret-history scan), además de Dependency Review y dashboard. Runs: 40978525543, 40978521649, 40978521865, 40978521671, 40978521571, 40978521386, 40978521350 y 40978521537. Después se añadieron dos commits documentales hasta `23cbb313ebb163d3c808f8d0953b85645262c520`; no se devolvieron runs/statuses para ese HEAD. Por tanto, **no declarar verde el HEAD actual** ni fusionar hasta verificarlo.

## Pasos para el siguiente agente

1. Confirmar branch HEAD, main SHA, estado PR #156, reviews, threads y checks exactos.
2. Revisar el diff de PR #156 completo; corregir errores documentales y esperar revisión adicional antes de merge.
3. Continuar auditoría read-only de esquema/rutas/constraints/índices/queries, y registrar evidencias.
4. Preparar ERD y matriz de propiedad/scope de organización-sucursal-almacén-caja.
5. Cerrar decisiones de roles y operaciones sensibles con aprobación explícita.
6. Diseñar API y transacciones de catálogo/inventario/compra/caja/venta/devolución, con idempotencia y pruebas negativas.
7. Investigar proveedor BCV, fuente/fecha/frescura/fallback; implementar después de validar fiabilidad y condiciones.
8. Medir capacidad antes de definir límites comerciales.

## Continuidad prioritaria — hardening de FRONTEND_ORIGIN (2026-10-29 UTC)

- Main base verificada: `0ba45e47daa5af9bbd9034690443405aa8bedf44`.
- PR #154: abierta, sin reviews; ocho workflows consultados para su SHA exacto terminaron success. Codex review falló por cuota; no existe review independiente. Respetar el gate de revisión y no fusionar.
- Rama de trabajo nueva: `fix/google-auth-frontend-origin-https-20261029`; objetivo único: alinear validación de `FRONTEND_ORIGIN` en `google-auth.ts` con `index.ts` (HTTPS salvo loopback HTTP), y añadir pruebas negativas.
- Diff revisado manualmente. En SHA `18cf2f158552ce7c97bacc66018e0cfdae60e2d3`, los 8 workflows consultados terminaron `success`, incluidos CI (build/typecheck, unit tests, PostgreSQL auth integration) y Playwright E2E. PR #155 sigue abierta; no declarar corregido en main hasta merge autorizado y verificado.
- No tocar Neon `main`, secretos, datos reales, esquema/migraciones ni producción. Previews de Cloudflare son automáticos y no son producción.
- Tras cerrar este hardening, continuar auditoría de arquitectura multiempresa y preparar propuesta de sucursales. No implementar endpoints comerciales ni permisos hasta aprobación de la matriz de roles.
- La capacidad sostenible de tenants no está medida; revisar todos los límites Neon/Cloudflare y probar en entorno sintético antes de prometer cantidades.

---

## CONTINUIDAD VIVA — después de PR #152 (2026-10-29 UTC)

- PR [#152](https://github.com/BTF14/Micro-app/pull/152) fusionada en `main`, merge commit `9376419231501f837a2d85d8741f7bfa9f57a0cc`. Los 13 checks del HEAD de PR y los nueve checks post-merge observados terminaron en `success`.
- Rama activa para la siguiente corrección: `fix/bootstrap-token-post-body-20261029`. Objetivo único: dejar de aceptar `bootstrap_token` por URL, exigir POST con cuerpo, Origin exacto del frontend configurado, campos únicos/permitidos y límite de 2 KiB; pruebas de regresión incluidas.
- No considerar el riesgo mitigado hasta comprobar CI del SHA final, revisar diff y fusionar por el proceso protegido. No autoaprobar ni saltar reglas.
- No producción, secretos ni Neon `main`; no ejecutar migraciones ni borrar ramas/backups.
- Luego retomar auditoría de consultas/constraints, contrato organización → sucursal → membresía/rol y matriz de permisos aún pendiente de aprobación.

---

## ESTADO OPERATIVO VIGENTE — respaldo cifrado (2026-10-29 UTC)

> Esta sección prevalece sobre notas históricas inferiores que todavía digan que el incidente de subida está pendiente. No borrar el historial: interpretar cada incidente según la evidencia posterior.

- **Subida del backup: VERIFICADA.** Run [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) terminó en success: `pg_dump 18.6`, dump no vacío, cifrado age, checksum SHA-256, commit remoto `2b038bd`, push a la rama `main` del repositorio privado de backups y retención `deleted 0 file(s)`.
- **Par cifrado persistido según logs:** `daily/backup-2026-10-29T17-29-48Z.dump.age` y `.sha256`.
- **Restauración técnica real: VERIFICADA** en run [40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124), tras checksum, descifrado y restauración en PostgreSQL 18 efímero. La prueba sintética automatizada es complementaria.
- Siguen pendientes la validación de datos comerciales poblados/conteos/relaciones, medición de RPO/RTO, alerta de fallo y evidencia del coste total $0.
- PR [#148](https://github.com/BTF14/Micro-app/pull/148) quedó fusionada el 2026-10-29; merge commit `0681aea75b555d5eb0b60dfec26c2706207fae45`. No está abierta y no debe reabrirse para este trabajo.
- **Plan de arquitectura:** [docs/ARCHITECTURE_EVOLUTION_PLAN.md](./ARCHITECTURE_EVOLUTION_PLAN.md). La restauración técnica está cerrada; continuar la auditoría de solo lectura de esquema, autorización, sucursales y capacidad antes de proponer cambios de código o migraciones.
- **Base de código auditada antes de esta actualización documental:** `70984baf7f6ac5a442e6c2364aaf6d7d4ebbc7d4`; PR [#151](https://github.com/BTF14/Micro-app/pull/151) está fusionada. No había PR abiertas en la consulta posterior; comprobar de nuevo antes de crear otra.
- **Capacidad:** sin medir; el proyecto Neon conectado informa `free_v3`, 10 ramas máximas y 3 existentes, incluido `restore-test-20261028`; límite lógico reportado de 512 MiB por rama y compute predeterminado 0.25 CU. El límite de empresas/sucursales sigue sin medir y Cloudflare no está verificado en vivo. Ver `docs/CAPACITY_AND_LIMITS.md`. La API expone autenticación y `GET /health`, sin endpoints comerciales HTTP aún. No se encontró tabla de sucursales en la migración inicial.
- **Seguridad a revisar:** `apps/api/src/google-auth.ts` recibe `bootstrap_token` en la URL. Es un riesgo potencial de exposición, no una filtración confirmada; revisar mitigación con POST/cuerpo y pruebas antes de cambiar el flujo.
- **Producción: NO lista.** Faltan handlers comerciales, matriz aprobada de permisos, autorización cross-tenant real, idempotencia/concurrencia, pruebas E2E, BCV/fiscalidad y validación completa de recuperación.
- Límites vigentes: no desplegar producción, no acceder a Neon `main`, no pedir ni imprimir claves privadas age, no borrar backups/recursos, y no declarar coste $0 sin evidencia.

> Estado prioritario de continuidad: la restauración técnica ya pasó y las PR #150/#151 están fusionadas. Las notas históricas posteriores se conservan, pero cualquier afirmación anterior de restauración pendiente o PR abierta está superada por este encabezado y por `docs/CURRENT_STATE.md`. No borrar el historial.

---

## REGLA PERMANENTE PARA EL SIGUIENTE CHAT — capacidad y límites (2026-10-29 UTC)

Antes de declarar listo para producción o aceptar un número de empresas, leer `docs/CAPACITY_AND_LIMITS.md` y `docs/ARCHITECTURE_EVOLUTION_PLAN.md`. El límite de organizaciones/sucursales está **sin medir**. Revisar Neon/PostgreSQL, Cloudflare Workers, Cloudflare Pages y servicios auxiliares; comprobar las cuotas vigentes y probar carga sintética en un entorno efímero/autorizado. Medir latencia, errores, CPU, conexiones, concurrencia, almacenamiento y crecimiento. Entregar capacidad demostrada, límite operativo conservador y umbrales de alerta; no inventar cifras.

No usar Neon `main`, datos reales, despliegues de producción ni servicios de pago para esta auditoría; no cambiar planes/secretos ni incurrir en costes sin autorización. Optimizar según evidencia y no introducir microservicios prematuramente.

### Estado del trabajo en curso
- Backup real: run [40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124) verificó descarga, checksum, descifrado y restauración en PostgreSQL 18 efímero. No demuestra integridad de todos los datos comerciales ni RPO/RTO/alertas/coste $0.
- PR [#150](https://github.com/BTF14/Micro-app/pull/150) y PR [#151](https://github.com/BTF14/Micro-app/pull/151) están fusionadas. La #151 añadió `docs/CAPACITY_AND_LIMITS.md` y guardrails de capacidad; sus checks del SHA de cabeza pasaron antes de la fusión. Verificar siempre el estado vivo antes de asumir que una PR histórica sigue abierta.

## ESTADO OPERATIVO VIGENTE — respaldo cifrado (2026-10-29 UTC)

> Esta sección prevalece sobre notas históricas inferiores que todavía digan que el incidente de subida está pendiente. No borrar el historial: interpretar cada incidente según la evidencia posterior.

- **Subida del backup: VERIFICADA.** Run [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) terminó en success: `pg_dump 18.6`, dump no vacío, cifrado age, checksum SHA-256, commit remoto `2b038bd`, push a la rama `main` del repositorio privado de backups y retención `deleted 0 file(s)`.
- **Par cifrado persistido según logs:** `daily/backup-2026-10-29T17-29-48Z.dump.age` y `.sha256`.
- **Pendiente:** ejecutar `.github/workflows/backup-real-restore.yml` manualmente tras configurar `AGE_PRIVATE_KEY` como secreto protegido. El workflow verifica checksum de los bytes descargados y restaura en PostgreSQL efímero, sin Neon ni recursos persistentes. También siguen pendientes RPO/RTO, alerta de fallo y evidencia de coste $0.
- La prueba sintética automatizada de restauración es complementaria; no sustituye la restauración del backup real.
- PR [#148](https://github.com/BTF14/Micro-app/pull/148) quedó fusionada el 2026-10-29; merge commit `0681aea75b555d5eb0b60dfec26c2706207fae45`. No está abierta y no debe reabrirse para este trabajo.
- **Plan de arquitectura:** [docs/ARCHITECTURE_EVOLUTION_PLAN.md](./ARCHITECTURE_EVOLUTION_PLAN.md). La auditoría comienza después de cerrar la restauración real del backup; primero lectura y diagnóstico, sin migraciones ni cambios productivos.
- Límites vigentes: no desplegar producción, no acceder a Neon `main`, no pedir ni imprimir claves privadas age, no borrar backups/recursos, y no declarar coste $0 sin evidencia.


---

## ESTADO VIVO PRIORITARIO — tras fusionar PR #137 (2026-10-29 UTC)

**Repositorio único:** https://github.com/BTF14/Micro-app  
**Main verificado:** `2f5fb9bb837cb6f75eaf691e0d7f8281113557c5` — merge de [PR #137](https://github.com/BTF14/Micro-app/pull/137). En la última búsqueda, no había PR abiertas; repetir la consulta antes de operar.  
**Autorización del propietario:** temporalmente autoriza a la IA a investigar, implementar, verificar y fusionar PRs con criterio. Calidad/seguridad por encima de rapidez. No inundar el repo de PRs ni dejar ramas/PRs de prueba olvidadas.

### Lo que realmente se hizo y lo que no

- PR #137 se fusionó. Añadió auditoría de versiones estables, plan de actualización, y `.github/workflows/daily-dependency-watch.yml`.
- **No se actualizaron dependencias en PR #137.** La actualización de paquetes sigue pendiente; no describir los majors propuestos como instalados.
- El monitor diario está en `main`, programado a las 08:15 UTC (04:15 Venezuela), con `workflow_dispatch`, permisos `contents: read`, `pnpm install --frozen-lockfile`, `pnpm outdated -r`, comprobación del último parche Node 24 LTS y `pnpm audit --audit-level high`. Es de solo lectura y no abre PR ni modifica dependencias.
- Se confirmó el run real [40829413589](https://github.com/BTF14/Micro-app/actions/runs/40829413589) en SHA `0763c70647ff11a8bcf91386a274d549246407ef`; instalación congelada y `pnpm audit --audit-level high` pasaron, con `No known vulnerabilities found`. La revisión de logs detectó que Bash ejecutó fragmentos entre backticks y que `pnpm outdated -r` no dejó un listado visible; por tanto, el run no validó bien el informe de actualizaciones. La corrección está en `fix/dependency-watch-report-20261029`; esperar CI y un nuevo run antes de declarar el monitor verificado.
- En la última consulta de checks de `2f5fb9bb837cb6f75eaf691e0d7f8281113557c5`: `verify`, Chromium auth, migración PostgreSQL, análisis estático y Trivy mostraban éxito; Workers, Pages y una instancia de scan de historial seguían en curso/duplicadas. Volver a consultar el estado del SHA exacto; no declarar todo verde hasta que termine.
- No se modificaron dependencias, lockfile, secretos, Neon `main`, datos reales ni se hizo despliegue manual en esta tarea. El check de Cloudflare puede generar su propia actividad automática; no equivale a que la IA hiciera un despliegue manual.

### Inventario declarado/resuelto que debe verificarse otra vez en main

- Node range `>=24.22.1 <25`; usar Node 24 LTS y actualizar al parche estable vigente tras comprobar compatibilidad.
- pnpm lockfile v9; no saltar automáticamente a otro major de pnpm.
- TypeScript `5.9.3` (raíz/API/web); TypeScript 7 no está aplicado.
- Hono `4.13.14`; Workers types `5.20261026.1`; Wrangler `4.152.0`.
- React/react-dom `19.3.1`; tipos React y React DOM `19.3.0`.
- Vite `7.3.7`; `@vitejs/plugin-react` `5.2.0`; jsdom `26.1.0`.
- Override crítico: `undici@7.30.1` en `package.json` y `pnpm-lock.yaml`. No aceptar que desaparezca el override o que el lockfile resuelva `undici@7.29.1`. Esto ya causó `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` y un hallazgo alto.
- PRs #117 (TypeScript 7), #118 (plugin-react 6), #119 (Vite 8) y #120 (jsdom 30) se cerraron sin merge. No asumir que esos upgrades se instalaron. Verificar releases estables/registry y compatibilidad actual antes de retomar.

### Siguiente trabajo obligatorio

1. Leer los documentos de arranque enumerados más abajo y verificar SHA de `main`, PRs abiertas, checks y workflows en vivo.
2. Confirmar que todos los checks post-merge de #137 terminaron y ejecutar el monitor diario manualmente; guardar URL del run, SHA, resultado y resumen.
3. Auditar versiones estables y advisories en el registry al momento de trabajar; priorizar vulnerabilidades explotables/alta severidad y parches compatibles, no solo números de versión.
4. Hacer una única PR coherente para la actualización técnica: primero parches/minors compatibles; migrar Vite 8 + plugin-react 6 + jsdom 30 y evaluar TypeScript 7 con revisión de engines, peer dependencies, breaking changes y pruebas. Separar cambios si mezclar majors impide aislar fallos, pero no abrir PR por paquete sin necesidad.
5. Generar el lockfile con la versión real de pnpm y mantener `pnpm install --frozen-lockfile` verde. Nunca editar resoluciones del lockfile a mano. Conservar el override de Undici o sustituirlo solo con evidencia de seguridad revisada.
6. Exigir checks verdes en el SHA exacto: verify, build/tests web y API, typecheck, migración PostgreSQL, Chromium auth, análisis estático, Dependency Review, Trivy, scan de secretos/historial y builds Pages/Workers. Diagnosticar logs y corregir causa raíz antes de fusionar.
7. Tras merge, comprobar versiones declaradas y resueltas, override, checks de main y ejecutar/documentar el monitor. Actualizar `CURRENT_STATE.md`, `HANDOFF_NEXT_CHAT.md`, `STATE_JOURNAL.md` y plan si cambia el estado.
8. Mantener los límites del proyecto: no cambiar secretos ni pedirlos, no tocar Neon `main` ni datos reales, no desplegar manualmente producción. Restauración integral con datos sintéticos sigue pendiente para la última fase. No borrar ramas/recursos a través de métodos alternativos si un control de seguridad bloquea la acción.

### Documentos que hay que leer antes de actuar

`AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/SECURITY_ROADMAP.md`, `docs/BACKUP_AND_RECOVERY.md`. Las notas antiguas dentro de estos archivos son histórico; esta sección de estado vivo tiene prioridad, pero siempre revalidar contra GitHub.

---

## Prioridad del siguiente chat — auditoría de versiones y migración segura (2026-10-29)

**Repo:** https://github.com/BTF14/Micro-app  
**HEAD vivo conocido al iniciar esta nota:** 59ad394d6dc5035b114db5379b2e1680d1e7969f (merge PR #136). Antes de actuar, volver a consultar SHA de main, PRs abiertas y checks. Esta auditoría se está documentando en la rama docs/market-dependency-audit-20261029; revisar si su PR se abrió/fusionó antes de crear trabajo adicional.

### Qué quiere el propietario
Quiere versiones modernas y seguras del mercado por la evolución de amenazas y de la cadena de suministro de software. Tiene autorización temporal para que la IA revise, implemente, pruebe y fusione PRs con criterio. El propietario recalca: documentar exhaustivamente la continuidad para el siguiente chat/IA; calidad y seguridad por encima de rapidez; evitar inundar el repo con PRs de limpieza.

### Estado comprobado y corrección importante
- PR #136 solo actualizó documentación; no actualizó paquetes.
- En main: TypeScript 5.9.3, Vite 7.3.7, @vitejs/plugin-react 5.2.0, jsdom 26.1.0, Wrangler 4.152.0, Hono 4.13.14, React/react-dom 19.3.1, tipos React 19.3.0, Workers types 5.20261026.1, override de undici 7.30.1.
- PR #117 (TypeScript 7.0.2), #118 (plugin-react 6.1.2), #119 (Vite 8.3.5), #120 (jsdom 30.1.3) están cerradas sin merge. No declarar que sus versiones están aplicadas.
- Dependabot anteriormente quitó el override undici@7.30.1 del lockfile y provocó ERR_PNPM_LOCKFILE_CONFIG_MISMATCH; Dependency Review encontró undici@7.29.1 con severidad alta. La PR #116 se fusionó tras preservar el override. Este guardrail es obligatorio.
- Última consulta de PRs: no se devolvieron PR abiertas; repetir búsqueda en vivo, porque el estado puede cambiar.

### Versiones publicadas observadas el 2026-10-29
- TypeScript 7.0.2 stable/latest: https://www.npmjs.com/package/typescript
- Vite 8.3.5 latest, Vite 7.3.7 versión anterior: https://www.npmjs.com/package/vite
- plugin-react 6.1.2 latest: https://www.npmjs.com/package/@vitejs/plugin-react
- jsdom 30.1.3: https://www.npmjs.com/package/jsdom
- Wrangler 4.154.0 latest: https://www.npmjs.com/package/wrangler
- Hono 4.13.14 estable; no migrar a 5.0.0-rc: https://www.npmjs.com/package/hono
- React/react-dom 19.3.1; tipos React 19.3.0.
- pnpm 12.16.1 latest observado, pero el repo usa lockfile v9: https://www.npmjs.com/package/pnpm
- Node 24.22.2 LTS publicado el 2026-10-28; Node 26.13.0 también aparece como LTS. Mantener línea Node 24 por ahora y probar parches.
- Las páginas indexadas de @cloudflare/workers-types no coinciden temporalmente entre sí; repo declara 5.20261026.1. Consultar registry en la ejecución real antes de afirmar que hay una versión superior; considerar wrangler types como proyecto de migración separado.

### Monitor diario de versiones y vulnerabilidades — PR #137

- Se añadió `.github/workflows/daily-dependency-watch.yml` en la rama de la PR #137; verificar que siga en esa PR y revisar checks del HEAD actual.
- Cron: 08:15 UTC diario (04:15 Venezuela), además de ejecución manual. Solo lectura: permisos `contents: read`, instalación congelada, `pnpm outdated -r`, consulta del parche Node 24 LTS e informe `pnpm audit --audit-level high`.
- La salida se guarda en el resumen de Actions. No abre PRs ni actualiza paquetes. Un audit con hallazgos high/critical hace fallar el workflow después de escribir el resumen; inspeccionar el log para separar advisories de errores de registry.
- Dependabot continúa semanal para npm y GitHub Actions. No cambiar a PRs diarias automáticas: se busca visibilidad diaria sin inundar el repositorio.
- Antes de fusionar, revisar YAML/diff y comprobar checks obligatorios del SHA exacto. Después del merge, verificar el primer run manual del workflow y dejar evidencia (run URL, SHA, resultado) en CURRENT_STATE y STATE_JOURNAL.
- No afirmar que el monitor ya corre diariamente hasta que esté fusionado y exista al menos una ejecución real. Mantener `undici@7.30.1` en ambos manifiestos de dependencia/lockfile; no editar el lockfile a mano.

### Qué hacer a continuación
1. Terminar la auditoría/documentación de esta rama y abrir una sola PR documental si no existe ya una equivalente.
2. Luego ejecutar una actualización de dependencias real en una rama aparte, generando el lockfile con pnpm real (no edición manual). Agrupar coherentemente Vite 8 + plugin-react 6 + jsdom 30; evaluar TypeScript 7 en la misma migración solo tras revisar compatibilidad. Wrangler patch/minor se puede incluir si pasa CI.
3. No tocar majors del gestor pnpm ni cambiar Node a 26 sin una prueba explícita.
4. Preservar overrides.undici = 7.30.1 en package.json y pnpm-lock.yaml; rechazar cualquier lockfile que elimine el bloque o resuelva 7.29.1.
5. Exigir checks obligatorios verdes en el HEAD exacto: verify, Chromium auth smoke tests, PostgreSQL migration, static analysis, Trivy, secret-history scan; además Dependency Review, Pages y Workers. Revisar logs si falla, arreglar causa real y evitar PRs pequeñas repetidas.
6. Después del merge, verificar manifests y lockfile en main, checks post-merge y documentar SHA, PR, versiones declaradas/resueltas, limitaciones y siguiente tarea.
7. No desplegar manualmente a producción, no cambiar secretos, no tocar Neon main ni datos reales. No realizar restore integral hasta la última fase sintética; el backup probado anteriormente tenía tablas comerciales vacías.
8. Antes de cualquier trabajo, leer AGENTS.md, docs/CONSTITUTION.md, docs/CURRENT_STATE.md, este archivo, docs/AI_COLLABORATION_AND_PR_POLICY.md, docs/PROJECT_PLAN.md, docs/STATE_JOURNAL.md, docs/RESOURCE_REGISTRY.md, docs/SECURITY_ROADMAP.md y docs/BACKUP_AND_RECOVERY.md.


---

## Arranque obligatorio — estado vivo tras PR #134 (2026-10-29 UTC)

Repositorio: https://github.com/BTF14/Micro-app. HEAD verificado de `main`: `764ed502d2a296136d311e05d081ca8e9f7cfeb9`, merge de PR #134 (reglas Dependabot/lockfile y continuidad). PR #116 y #131 también están fusionadas. En la última búsqueda no había PR abiertas; reconsultar SHA, PRs y checks en vivo antes de actuar. Leer primero `AGENTS.md`, `docs/CURRENT_STATE.md`, este handoff, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/SECURITY_ROADMAP.md` y `docs/BACKUP_AND_RECOVERY.md`.

### Inventario actual de versiones

- Node `>=24.22.1 <25`; pnpm lockfile v9.
- TypeScript `^5.9.3` (resuelto `5.9.3`) en raíz/API/web. TypeScript 7 NO se fusionó.
- API: Hono `^4.13.14` (resuelto `4.13.14`), `@cloudflare/workers-types ^5.20261026.1`, Wrangler `^4.152.0`.
- Web: React/React DOM `^19.1.1` (resueltos `19.3.1`), Vite `^7.1.7` (resuelto `7.3.7`), plugin React `^5.0.4` (resuelto `5.2.0`), jsdom `^26.1.0` (resuelto `26.1.0`).
- `undici@7.30.1` sigue fijado en el override y lockfile; no aceptar lockfiles que quiten el override o resuelvan `7.29.1`.
- PR #117 TypeScript 7, #118 plugin-react 6, #119 Vite 8 y #120 jsdom 30 cerradas sin merge. No presentarlas como actualizaciones aplicadas ni reintroducirlas sin plan de compatibilidad y CI verde.

### Dependabot — resultado y guardrails

- PR #116 (Hono, Cloudflare Workers types y Wrangler) está fusionada. HEAD final de PR: `5d3f2e373e75caf71af207cba61df3066b140a86`. Los checks de la PR pasaron, incluidos Dependency Review, `verify`, Chromium, migraciones, static analysis, Trivy, scan de historial de secretos y builds de Cloudflare.
- La causa de los fallos anteriores era que el lockfile generado por Dependabot eliminaba `overrides: undici: 7.30.1`, en desacuerdo con `package.json`, y resolvía `undici@7.29.1`. El arreglo de #116 preserva el override. En el `main` actual, `pnpm-lock.yaml` contiene el override y `undici@7.30.1`, y no contiene `undici@7.29.1`.
- PR #117 (TypeScript 7), #118 (plugin-react 6), #119 (Vite 8) y #120 (jsdom 30) están cerradas sin fusionar. No afirmar que sus versiones se aplicaron. No reabrir ni aplicar los upgrades sin revisar compatibilidad y plan de pruebas.
- Seguimiento post-merge completado: los checks consultados para `9f73f8ab0c1581145796f09a41f689fa4bdcf310` terminaron todos en `success`. El HEAD de documentación posterior `764ed502d2a296136d311e05d081ca8e9f7cfeb9` también tiene los checks consultados en `success`, incluidos `verify`, Chromium, migraciones, Trivy, scan de secretos/historial, análisis estático, Cloudflare Pages y Workers.

### Próximos pasos

1. **Completado:** todos los checks consultados del merge de PR #132 están en `success`.
2. Mantener `pnpm.overrides.undici = 7.30.1` coherente con el lockfile; exigir `pnpm install --frozen-lockfile` y Dependency Review verdes en toda actualización.
3. No fusionar PR solo porque sea de Dependabot: comprobar SHA exacto, diff, lockfile, seguridad y compatibilidad. Evitar múltiples PR para una causa común.
4. Continuar la hoja de ruta de seguridad; la prueba integral de restauración con datos sintéticos poblados sigue pendiente y debe quedar para la última fase.

PR #131 está fusionada y añade solo un resumen visible ante fallos de backup en Actions; no envía por sí mismo correo/push. No se tocaron Neon `main`, secretos, datos reales ni producción, y no se hizo despliegue manual.

---

## Arranque obligatorio — continuidad tras PR #130 (2026-10-29 UTC)

Repositorio: https://github.com/BTF14/Micro-app. Última referencia de `main` verificada al iniciar este trabajo: `3ce18e2aa5bcf2a8c555a47681998405a4f14509` (fusión de PR #130); reconsultar el SHA vivo antes de operar, pues cambiará al fusionarse la PR de monitorización. PR #129 corrigió la retención de 15 días y sus checks pasaron.

### Lee primero
`AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, este archivo, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/SECURITY_ROADMAP.md` y `docs/BACKUP_AND_RECOVERY.md`. No asumir que notas históricas más abajo siguen describiendo el estado vivo.

### Secretos y rama Neon de prueba
- El propietario confirma que eliminó `RESTORE_TEST_AGE_KEY` y que `RESTORE_TEST_DB_URL` ya no aparece en la lista actual de Repository secrets; no se conoce la fecha exacta de eliminación. Nunca pedir valores ni imprimirlos.
- Los únicos secretos que el propietario reporta actualmente son `BACKUP_REPO_TOKEN` y `DATABASE_URL_BACKUP_RO`; conservarlos para el backup permanente.
- Neon todavía muestra la rama `restore-test-20261028`, ID `br-broad-dust-b7cvgjtv`, en el proyecto `restless-fire-99110035`. El borrado vía herramienta fue bloqueado por controles de seguridad; no eludir el bloqueo. Si se necesita limpiar, indicar los pasos para borrarla manualmente desde la consola Neon y confirmar el ID para evitar `main`.

### Política de retención obligatoria para cualquier IA o chat
- Mantener la retención actual de **15 días**; el backup permanente se genera a diario y el workflow elimina solo los archivos cuyo timestamp UTC validado del nombre supera los 15 días, junto con su checksum.
- No borrar los backups anteriores cada vez que se crea uno nuevo. Si la ejecución nueva falla o no se valida, conservar la última copia válida y comprobar que exista una alerta visible.
- No reducir/aumentar la retención ni crear otro workflow sin revisar primero `docs/BACKUP_AND_RECOVERY.md`, coste objetivo $0 y riesgos de recuperación. Cualquier cambio debe ir en el flujo existente, con pruebas y documentación; evitar PRs fragmentadas.
- La retención automática no demuestra que un backup pueda restaurarse. La prueba aislada con datos sintéticos relacionados, el manifiesto comparativo, RPO/RTO y confirmación de notificaciones externas siguen pendientes. El workflow publica ahora un resumen visible en el run de Actions ante fallos, pero no envía por sí mismo un correo/push. La restauración se mantiene para la última fase.

### Backup permanente y siguiente trabajo
- PR #129 corrigió la retención: ahora se analiza el timestamp UTC validado del nombre `backup-YYYY-MM-DDTHH-MM-SSZ.dump.age`, y se elimina el checksum correspondiente cuando se elimina el backup vencido. CI incluye pruebas unitarias; todos los checks de ese HEAD pasaron.
- La restauración técnica del backup cifrado se verificó en PostgreSQL desechable en [run 40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192), pero las tablas comerciales estaban vacías. El siguiente paso es preparar una única prueba aislada con datos sintéticos relacionados y manifiesto de conteos/relaciones, restaurar y comparar. Documentar RPO/RTO, alertas y coste $0.
- La restauración debe ser la última fase. No usar datos reales, Neon `main`, producción ni herramientas de pago. No recrear el workflow temporal de PR #127 y no abrir PRs fragmentadas.
- No declarar recuperación integral probada hasta que la prueba sintética poblada y las verificaciones operativas queden documentadas.

---

## Arranque obligatorio — continuidad después de PR #128 (2026-10-29 UTC)

Repositorio único: https://github.com/BTF14/Micro-app. SHA verificado de `main`: `9b4ee7d2ed704288cd0cf149c93569a698f46e1b`. PR [#128](https://github.com/BTF14/Micro-app/pull/128) está fusionada. Reconsultar el estado vivo antes de operar.

### Lee primero
`AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, este archivo, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/SECURITY_ROADMAP.md`, `docs/BACKUP_AND_RECOVERY.md` y cualquier documento de decisión pertinente al siguiente trabajo. No asumir que un snapshot histórico sigue describiendo el estado vivo.

### Estado exacto de limpieza del restore
- PR #127 eliminó `.github/workflows/restore-test-20261028.yml` y actualizó documentación. No recrear ese workflow ni crear una PR duplicada para retirarlo.
- El propietario confirma que eliminó `RESTORE_TEST_AGE_KEY` y que `RESTORE_TEST_DB_URL` ya no aparece en la lista actual de Repository secrets; no se conoce la fecha exacta de eliminación. Nunca pedir valores ni imprimirlos.
- Los únicos secretos que el propietario reporta actualmente son `BACKUP_REPO_TOKEN` y `DATABASE_URL_BACKUP_RO`; conservarlos para el backup permanente.
- La rama Neon `restore-test-20261028` todavía existía en la última comprobación; el intento de borrado de la herramienta fue bloqueado por controles de seguridad. No afirmar que se borró ni intentar eludir el bloqueo. Si se requiere terminar la limpieza, indicar al propietario cómo verificar y borrar esa rama desde la consola Neon, comprobando el ID y evitando `main`.
- No se tocó Neon `main`, datos reales ni producción.

### Restore y opción D
Run [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192) fue exitoso: checksum, descifrado, `pg_restore`, 13 tablas, 186 constraints, 0 membresías huérfanas y exclusión de `auth_sessions`/`auth_rate_limits`. Las tablas comerciales/auditoría estaban vacías; esto no prueba la recuperación de un conjunto comercial poblado.
Inspección ya realizada: `.github/workflows/backup.yml` usa `pg_dump`, `age`, repositorio privado de backups y retención de 15 días. Se detectó que `find -mtime` no es fiable después de `git clone` porque los mtimes corresponden al checkout, no a la fecha del backup. La PR de corrección sustituye retención por timestamp UTC del nombre del backup y añade pruebas unitarias al CI. Tras comprobar los checks y resolver la revisión, continuar con una sola prueba aislada de datos sintéticos relacionados y manifiesto de conteos; comparar en PostgreSQL desechable y registrar límites, RPO/RTO, alertas y coste $0. No usar datos reales, Neon `main`, producción ni herramientas de pago.

### Disciplina de continuidad
Documentar en `CURRENT_STATE.md`, `STATE_JOURNAL.md`, este handoff y el documento técnico afectado. Mantener estado de cada tarea como verificado / pendiente / bloqueado y guardar SHA, PR, run IDs, causa raíz y siguiente paso. No declarar éxito si la herramienta bloqueó una operación. Una sola PR para un objetivo documental coherente, no inundar el repositorio.

---

## Continuidad verificada — restore de backup (2026-10-29 UTC)

- PR #126 fusionada. Run manual del workflow temporal: [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192), `success`; las cinco verificaciones terminaron en verde.
- Backup usado: `backup-2026-10-28T13-39-39Z.dump.age`. Confirmado checksum, descifrado, restauración en rama PostgreSQL desechable, 13 tablas esperadas, 186 constraints, cero membresías huérfanas y ausencia de `auth_sessions`/`auth_rate_limits`.
- Limitación: las tablas de negocio (`products`, `suppliers`, `exchange_rates`, `sales`, `sale_items`, `payments`, `inventory_movements`, `audit_logs`) estaban vacías en la copia. Se prueba la restauración técnica, no la recuperación de un conjunto comercial poblado ni la igualdad de conteos con origen.
- PR de limpieza por completar: eliminar `.github/workflows/restore-test-20261028.yml` y actualizar `BACKUP_AND_RECOVERY.md`, `SECURITY_ROADMAP.md`, este handoff, `CURRENT_STATE.md` y `STATE_JOURNAL.md`. No fusionar sin los checks requeridos.
- Después del merge, el propietario debe borrar manualmente los secretos de repositorio `RESTORE_TEST_AGE_KEY` y `RESTORE_TEST_DB_URL`, y eliminar la rama Neon desechable `restore-test-20261028`. No tocar Neon `main` ni revelar secretos en chat.
- El punto de backup de Nivel 1 sigue parcialmente pendiente: datos sintéticos poblados, manifiesto/conteos comparativos, RPO/RTO, alertas, retención y evidencia de coste $0. La aplicación no está lista para producción por los bloqueos restantes de seguridad.

---

## Checkpoint posterior a PR #114 — 2026-10-29 UTC

- PR #114 quedó fusionada por squash en `main`: [merge commit dc3fae80c485ec52c2e68c80da316df90c68ac83](https://github.com/BTF14/Micro-app/commit/dc3fae80c485ec52c2e68c80da316df90c68ac83). El HEAD revisado fue `780e057435fea4ebd6213fd973745599e71d2088`; GitHub confirmó `merged=true`.
- Los ocho workflows de PR y los dos estados Vercel del HEAD de PR fueron `success`. Esto no equivale a CI post-merge: en el merge SHA los estados Vercel aparecen `pending` y el conector no devolvió workflows de Actions para ese SHA. Reconsultar antes de afirmar que pasó CI post-merge.
- Cloudflare Workers actualizó el estado a `Deployment successful!` y expuso URLs explícitas de preview de commit y rama: `https://36b3fea5-micro-app-api.btfcasheb.workers.dev` y `https://docs-continuity-after-pr-113-2026-10-28-micro-app-api.btfcasheb.workers.dev`. No se hizo despliegue manual.
- Esta actualización documental corrige la referencia obsoleta al estado abierto de PR #114 y al SHA anterior de `main`; conserva el historial previo sin reescribir decisiones antiguas.
- Siguen pendientes: restaurar el backup cifrado en PostgreSQL desechable; verificar headers CORS con HTTP real contra el Worker; decisión/aprobación de la matriz de permisos; aislamiento cross-tenant para rutas comerciales futuras. No declarar la app lista para producción. No tocar Neon `main`, secretos ni datos reales.

---

## Siguiente sesión — continuidad posterior a PR #113 (2026-10-28)

**SHA de referencia:** `4242bcef38f33a415f472fc9c04048e1eee3bdde`. Consultar HEAD/PR/Actions en vivo antes de actuar.

1. La PR #113 se fusionó: [commit](https://github.com/BTF14/Micro-app/commit/4242bcef38f33a415f472fc9c04048e1eee3bdde). La matriz de `docs/sdd/role-permission-decision-matrix.md` es una propuesta no aprobada; no implementar rutas de negocio hasta aprobación explícita o autorización nueva y concreta.
2. La revisión manual dejó en la PR tres advertencias: el descuento del 10 % es solo un ejemplo que requiere decisión; el alcance por sucursal/caja debe confirmarse; y la regla de último `owner` necesita serialización transaccional/pruebas concurrentes, no un CHECK ordinario.
3. Backup: run [40587638159](https://github.com/BTF14/Micro-app/actions/runs/40587638159) verificó cifrado, subida y checksum. Falta restauración a PostgreSQL desechable. La llave privada `age` está bajo custodia del propietario y no está en la sesión. No pedir que se pegue en el chat ni usar Neon `main`.
4. CORS de producción sigue sin prueba HTTP reciente de `OPTIONS` con origen permitido y atacante; no confundir tests del middleware con headers del Worker publicado. No usar automatización metered ni cambiar configuración Cloudflare a ciegas.
5. Issue #53: aislamiento cross-tenant de rutas comerciales todavía no se puede dar por cerrado porque esas rutas no están expuestas/probadas; issue #78: CORS/configuración efectiva sigue pendiente.
6. Auditoría de rama `security/secret-scan-current-main`: 1 ahead / 39 behind; checklist duplicado en `main`, workflow de rama usa checkout v4 mientras `main` usa v7, y su `.gitignore` omite la excepción de `apps/web/.env.production`. No fusionar ni eliminar sin revisión selectiva.
7. PR #113 tuvo workflows de PR exitosos en su HEAD exacto, pero Codex no completó la revisión por límite de uso; se hizo revisión manual. Los dos estados Vercel del commit de merge aparecen pendientes y no equivalen a CI posterior al merge. No declarar una segunda corrida.
8. Mantener coste $0, no crear PR duplicadas, no desplegar producción, no tocar secretos/Neon/datos reales y no marcar la app lista para producción. Priorizar tareas verificables sin saltarse las decisiones del propietario.

---

## Próximos pasos ejecutables — estado verificado 2026-10-28

1. **CORS de producción:** PR #103 está fusionada. Repetir `OPTIONS` al Worker productivo con el origin Pages autorizado y con `https://attacker.example`, guardando código HTTP y headers completos. En esta sesión el acceso web a los endpoints falló; no usar automatización metered ni cambiar variables Cloudflare a ciegas. Si no hay vía de red autorizada, continuar tareas independientes y dejar este control pendiente.
2. **Backup/restore:** run 40587638159 verificó cifrado, subida y checksum; restaura esa copia en PostgreSQL desechable y valida esquema, constraints, conteos/relaciones, duración y RPO/RTO conforme a la sección 6 de `docs/BACKUP_AND_RECOVERY.md`. La llave privada `age` está bajo custodia del propietario, no en el repositorio ni en esta sesión. No acceder ni escribir Neon `main`.
3. **Auth/tenant:** PR #111 está fusionada. El issue #53 sigue abierto: faltan rutas comerciales para demostrar aislamiento cross-tenant real y falta aprobación de la matriz de permisos por rol/organización. No declarar todo el issue resuelto.
4. **Dependabot:** el conector no permite leer alertas actuales. Mantener desconocido el recuento; no afirmar que el panel está limpio solo por el pin `undici@7.30.1` o Trivy.
5. **Adapter de Neon:** no fusionar `feat/neon-transaction-adapter` tal cual. Tiene 14 commits ahead y 124 behind; módulo database igual a main, pero pruebas más débiles y dependencias/workflow obsoletos. No borrar la rama ni PR antiguas hasta revisar si conservan cambios únicos.
6. **Inventario y protección:** al iniciar, verificar el SHA vivo de `main`, las PR abiertas y los checks de sus HEADs. La API de protección devuelve 403 y las fuentes documentales discrepan sobre el número de aprobaciones; confiar en los gates de GitHub y no sortearlos.

No presentar pruebas unitarias como prueba de producción. No hacer despliegues, cambios de secretos ni escrituras en Neon `main` sin el gate aplicable.

---




## Handoff vigente — 2026-10-28: PR #106 aisla Pages Preview de producción

- PR: https://github.com/BTF14/Micro-app/pull/106. Rama `fix/isolate-pages-preview-from-production-20261028`.
- HEAD verificado: `1d47a474351bb14f9f5e14283beec789356bafe3`; todos los checks consultados en ese SHA terminaron en success, incluido verify, Chromium auth smoke, JS/TS static analysis, dependency-review, postgres-migration, Trivy, secret-history scan, Cloudflare Pages y preview.
- Pruebas en sandbox: build de Preview pasó; bundle y CSP de salida no contienen el origen del Worker de producción; test dedicado de Preview pasó 1/1; suite web normal pasó 6/6 con el test de Preview omitido fuera de Preview; build de producción conserva la URL de API.
- HTTP real del branch Preview de Pages: HTTP 200 y CSP `connect-src 'self'`, sin permiso al Worker productivo.
- El frontend Preview no consulta sesión ni permite Google login. Esto evita que Preview use producción aunque todavía no haya API/DB de Preview aisladas. No ampliar CORS productivo ni configurar Preview con la DB real a ciegas.
- PR #106 ya fue fusionada mediante squash en `main` con commit `d5d99b3a5184d6aad36ffd9a44ff34a62346dc94`; Cloudflare Pages y Workers Builds reportaron éxito, y el endpoint público `/health` respondió `status: ok`. No se cambiaron secretos, variables/bindings de Cloudflare ni Neon. No se hizo despliegue manual.
- PR #103 permanece separada y abierta por la instrucción previa de revisión independiente. PR #105 no se debe fusionar con su override global de `undici >=7.30.1` que resuelve a 8.x.

---

## Handoff vigente — 2026-10-28: política de PR y continuidad entre agentes

- Documento normativo nuevo: `docs/AI_COLLABORATION_AND_PR_POLICY.md`. Leerlo junto con `AGENTS.md`; define alcance de PR, revisión alternativa cuando Claude/Codex no estén disponibles, verificación por SHA exacto, gates de merge/producción y continuidad entre chats.
- Se modificó `AGENTS.md` para incluir la política en la secuencia obligatoria de arranque. Estos cambios están en la rama documental `docs/ai-pr-policy-20261028`; comprobar en vivo si la PR correspondiente ya fue fusionada antes de asumir que la política está en `main`.
- Principio clave del propietario: priorizar que quede bien y seguro sobre la velocidad aparente; evitar PR redundantes y no inundar el repositorio. Reutilizar la misma PR para cambios del mismo objetivo; separar objetivos independientes.
- Claude y Codex son revisores adicionales, no bloqueo para continuar el trabajo técnico. Pero si el propietario pide explícitamente dejar una PR abierta hasta que estén disponibles, respetar esa instrucción.
- Estado CORS vigente: PR #103 (`fix/cors-preflight-coverage-20261028`) sigue abierta por instrucción del propietario hasta que Claude y Codex estén disponibles. El HEAD `39fc7c118fc5b99eef022a26fa91481bb2ef5638` tuvo los workflows consultados en `success`, pero la verificación HTTP real de preflight del Worker y la estrategia segura de API/CORS para Preview siguen pendientes. No afirmar que CORS de producción está resuelto, no fusionar ni desplegar por adelantado.
- No mezclar la política general de PR con PR #103: esa PR es solo para cobertura de pruebas CORS. La política se tramita como cambio documental independiente.

---

## Handoff vigente — 2026-10-28: falta la prueba de restauración; confirmar que las alertas de Dependabot bajaron

1. **Único pendiente real del respaldo automático**: probar una restauración real (`pg_restore`) contra una base PostgreSQL desechable, con los datos actuales de Neon, y verificar conteos/relaciones — criterios de aceptación en `docs/BACKUP_AND_RECOVERY.md` sección 6. El respaldo en sí (generación + cifrado + subida) ya está verificado con una corrida real.
2. **Confirmar con el propietario** que `github.com/BTF14/Micro-app/security/dependabot` ya no muestra las 15 alertas de vitest/tinypool/undici/@vitest-mocker (se resolvieron en PR #96 subiendo vitest a 5.x) — esta IA no puede leer esa lista desde este entorno (403 de permisos), así que la confirmación tiene que venir del propietario mirando la página directamente.
3. **La IA puede fusionar sola** (aprobación obligatoria desactivada desde 2026-10-27, PR + 6 checks en verde siguen siendo obligatorios).
4. Leer `docs/COMPLIANCE_AND_ACCESSIBILITY.md` (checklist externo de cumplimiento, evaluado; la mayoría no aplica todavía al modelo actual del negocio — no reactivar esos puntos sin pedírselo antes al propietario).
5. No adelantar el negocio real (inventario, ventas, BCV) hasta: (a) cerrar la prueba de restauración del punto 1, y (b) que la matriz de permisos por rol (`docs/sdd/role-permission-decision-matrix.md`, Nivel 2 punto 5) esté aprobada — o recibir autorización explícita y nueva del propietario para avanzar en paralelo.
6. Pendiente sin resolver, no bloqueante: revisar `feat/neon-transaction-adapter` contra `main`; varios PRs viejos abiertos (#59, #67–70, #72, #73, #77, #79) sin revisar — se le ofreció al propietario hacer limpieza de esto, sin respuesta todavía.
7. Nota de entorno: `pnpm install`/`npm` siguen sin poder resolver `registry.npmjs.org` por DNS en este sandbox (reconfirmado 2026-10-28); para cualquier cambio de dependencias, usar el patrón de esta sesión (workflow de un solo uso en GitHub Actions que regenera el lockfile y lo empuja a una rama) en vez de reintentar localmente.

---

## Handoff vigente — 2026-10-27: respaldo implementado, falta 1 secreto; checklist de cumplimiento evaluado

1. **La IA puede volver a fusionar sola.** El propietario desactivó la aprobación obligatoria (prefiere eso mientras es el único con acceso de escritura); GitHub nunca deja que el autor de un PR se apruebe a sí mismo, así que con 1 aprobación requerida todo quedaba bloqueado. Sigue requiriéndose PR + los 6 checks en verde.
2. **Pendiente único y bloqueante del respaldo automático (`.github/workflows/backup.yml`):** el propietario debe agregar el secreto `DATABASE_URL_BACKUP_RO` en `github.com/BTF14/Micro-app/settings/secrets/actions` (valor ya entregado por chat, nunca commiteado, no reconstruirlo de memoria — si se perdió, regenerar el rol `backup_readonly` en Neon y pedir el valor de nuevo). Una vez agregado: correr el workflow manualmente (`workflow_dispatch`) para confirmar que corre de punta a punta, y luego hacer una prueba de restauración real en una base desechable antes de confiar en él para datos reales (criterios de aceptación en `docs/BACKUP_AND_RECOVERY.md` sección 6).
3. **Leer `docs/COMPLIANCE_AND_ACCESSIBILITY.md`** (ahora parte de la secuencia de arranque de `AGENTS.md`): evalúa un checklist externo de 20 puntos legal/privacidad/accesibilidad. La mayoría no aplica todavía (no hay pagos, cookies de analítica ni registro público) — no reactivar esos puntos sin pedírselo antes al propietario. Dos pendientes reales y baratos: foco atrapado en `HelpModal` (`apps/web/src/App.tsx`), y una auditoría de contraste de color con herramienta cuando exista una vista de negocio real que auditar.
4. **PR #91 y #92 fusionados**: decisión sobre el blueprint externo de Gemini (`docs/PRICING_CACHE_ARCHITECTURE.md`) y respaldo automático + gate de dependencias + checklist de cumplimiento.
5. No adelantar el negocio real (inventario, ventas, BCV) hasta cerrar Nivel 1 completo (ya solo falta el secreto del punto 2 y su verificación) o recibir autorización explícita y nueva del propietario para avanzar en paralelo.
6. Pendiente sin resolver, no bloqueante: revisar `feat/neon-transaction-adapter` contra `main`; varios PRs viejos abiertos (#59, #67–70, #72, #73, #77, #79) sin revisar.
7. Nota de entorno: `pnpm install`/`npm` siguen sin poder resolver `registry.npmjs.org` por DNS en este sandbox; verificar todo vía GitHub Actions en el SHA exacto. Escrituras a rutas administrativas de la API de GitHub (branch protection, secrets, creación de repositorios) siguen bloqueadas por el proxy del entorno — no reintentar, ya confirmado varias veces.

---

## Handoff vigente — 2026-10-26 (noche): main protegida (flujo cambia), decisión sobre backups pendiente del propietario

1. **`main` ya tiene branch protection activa, verificada en vivo.** A partir de ahora **todo cambio, incluidos los checkpoints de documentación, pasa por PR** — ya no se puede empujar directo a `main`. Abrir rama → PR → esperar CI en verde → **esperar que el propietario apruebe y fusione en GitHub** (la IA no puede autoaprobarse: `required_approving_review_count: 1` en vivo, aunque el propietario reportó haberlo dejado en 0 — ver la discrepancia documentada en `docs/SECURITY_ROADMAP.md` punto 1 y pedirle que la revise/confirme).
2. **PR #91 abierto, CI en verde, esperando aprobación del propietario:** evaluación del blueprint externo de Gemini (`docs/PRICING_CACHE_ARCHITECTURE.md`) — adopta el diseño del cron BCV y la caché KV, rechaza explícitamente el offline-first de ventas. No revertir ese rechazo sin autorización nueva y explícita del propietario.
3. **Respaldo automático (Nivel 1, punto 2): en progreso, no terminado.** Ya hecho: rol Neon de solo lectura `backup_readonly` y un par de llaves `age` (pública documentada en el roadmap; privada entregada una sola vez al propietario, no vive en este entorno). **Bloqueado en el destino:** R2 no está habilitado en la cuenta de Cloudflare y activarlo puede exigir tarjeta, lo que choca con la regla de $0 sin tarjetas del proyecto. Se le presentaron dos opciones al propietario (R2 con alerta de presupuesto en $0, o un repositorio privado de GitHub dedicado solo a los volcados ya cifrados). **No escribir el workflow de subida hasta que el propietario elija.**
4. Ya implementado y verificado antes de esta sesión: identidad, login, UI de acceso, centro de ayuda, Dependabot, cabeceras de seguridad. Sin pendientes conocidos ahí.
5. No adelantar el negocio real (inventario, ventas, BCV) hasta cerrar Nivel 1 completo o recibir autorización explícita y nueva del propietario para avanzar en paralelo.
6. Pendiente sin resolver, no bloqueante: revisar `feat/neon-transaction-adapter` contra `main`; varios PRs viejos abiertos (#59, #67–70, #72, #73, #77, #79) sin revisar.
7. Nota de entorno: `pnpm install`/`npm` siguen sin poder resolver `registry.npmjs.org` por DNS en este sandbox; verificar todo vía GitHub Actions en el SHA exacto. Confirmado de nuevo en esta sesión: cualquier escritura a rutas administrativas de la API de GitHub (branch protection, secrets) sigue bloqueada por el proxy del entorno (`403 ... not permitted through this proxy`) — no reintentar, es un callejón sin salida ya documentado dos veces.

---

## Handoff vigente — 2026-10-26 (tarde): hoja de ruta de seguridad adoptada, léela primero

1. **Leer `docs/SECURITY_ROADMAP.md` completo antes de hacer nada más.** El propietario pidió explícitamente priorizar seguridad/corrección sobre velocidad, pensando en que el proyecto puede escalar a varias personas. Ese documento ahora es lectura obligatoria según `AGENTS.md` y define en qué orden implementar cada cosa (Nivel 1 antes de seguir con negocio, Nivel 2 antes del primer empleado, Nivel 3 al crecer el equipo).
2. **Pendiente urgente que requiere al propietario, no a la IA:** activar la protección de la rama `main` en GitHub (instrucciones exactas en la sección 1 de la hoja de ruta). Confirmado técnicamente que este agente no puede hacerlo vía API (el proxy de red del sandbox lo rechaza con 403 aunque el token tenga permiso admin) — no reintentar eso, es un callejón sin salida ya documentado.
3. Pendiente de implementación por la IA: respaldo automático cifrado de Neon a un destino independiente (diseño en la sección 2 de la hoja de ruta — Cloudflare R2 + GitHub Action programada). No se ha empezado.
4. Ya implementado: Dependabot (`.github/dependabot.yml`) y cabeceras de seguridad (frontend `_headers` + middleware de la API). PR #85, merge `11d29b183490286a02195d7f86b94f44853d3c5c`.
5. Identidad, login, UI de acceso y centro de ayuda siguen cerrados y verificados de punta a punta (ver el checkpoint de 2026-10-26 más arriba en `docs/CURRENT_STATE.md`). No hay pendientes conocidos ahí.
6. Una vez resueltos los puntos 2 y 3 (o con confirmación explícita del propietario de que se puede avanzar sin ellos), recién ahí construir el negocio real: inventario, productos, tasa BCV, ventas. No adelantar esa parte saltándose la hoja de ruta de seguridad sin que el propietario lo autorice de nuevo.
7. Pendiente sin resolver, no bloqueante: revisar `feat/neon-transaction-adapter` contra `main`. También hay varios PRs viejos abiertos y aparentemente abandonados (#59, #67, #68, #69, #70, #72, #73, #77, #79) que valdría revisar y cerrar como supersedidos si corresponde — no se tocaron en esta sesión.
8. Nota de entorno: en el sandbox usado hasta ahora, `pnpm install`/`npm` no pudieron resolver `registry.npmjs.org` por DNS; verificar cambios de frontend/API vía los checks de GitHub Actions en el SHA exacto, no localmente.

---

## Handoff vigente — 2026-10-26: todo lo de identidad/acceso/ayuda cerrado — arrancar negocio de cero

1. Leer primero el checkpoint superior de `docs/CURRENT_STATE.md`.
2. **Estado confirmado end-to-end por el dueño en su teléfono real:** login con Google, organización "Abasto 7 de Oro", botón de logout alcanzable en móvil, enlace de WhatsApp en cualquier error de la app, y un centro de ayuda básico (FAQ + Privacidad) en el pie de página. PRs #80–#84, todas fusionadas y desplegadas. **No hay ningún pendiente conocido de identidad, acceso o UI básica.**
3. Recordatorio del bug ya resuelto que no debe repetirse: cualquier variable de entorno nueva no-secreta del Worker debe declararse también en `apps/api/wrangler.toml`, o `wrangler deploy` la borra en el siguiente despliegue (pasó dos veces el 2026-10-25).
4. **La prioridad total del siguiente chat es construir el negocio real**: inventario, productos con precio en USD, tasa BCV con conversión a VES, ventas/caja. No existe código de nada de esto todavía — todo lo hecho hasta ahora (varias sesiones) ha sido identidad e infraestructura.
5. Para agregar un usuario nuevo (más allá del primero), seguir el patrón SQL documentado en `docs/CURRENT_STATE.md` (inserciones manuales en Neon por ahora).
6. Pendiente sin resolver, no bloqueante: revisar `feat/neon-transaction-adapter` contra `main` antes de cualquier merge.
7. Nota de entorno: en el sandbox usado hasta ahora, `pnpm install`/`npm` no pudieron resolver `registry.npmjs.org` por DNS; verificar cambios de frontend vía los checks de GitHub Actions en el SHA exacto, no localmente.

---

## Handoff vigente — 2026-10-25 (noche): identidad/infraestructura terminada, ver el bug de wrangler.toml antes de tocar variables

1. Leer primero el checkpoint superior de `docs/CURRENT_STATE.md` (bloque "Estado vivo — 2026-10-25 (noche)"). Contiene el bug más importante a recordar para no repetirlo.
2. **Bug ya resuelto pero crítico de no repetir:** `wrangler deploy` borra en silencio cualquier variable del Worker que esté puesta a mano en el dashboard de Cloudflare pero no declarada en `apps/api/wrangler.toml` (solo afecta a las que NO son "Secreto"). Ya pasó dos veces en esta sesión y rompió producción ambas veces sin que el cambio desplegado tuviera nada que ver con `apps/api`. Si se agrega una variable nueva no-secreta al Worker, agregarla también a `[vars]` en `wrangler.toml` en el mismo cambio.
3. Login con Google verificado funcionando de extremo a extremo, confirmado visualmente por el usuario en su teléfono real: organización "Abasto 7 de Oro", owner `btfcasheb@gmail.com`. Botón de "Cerrar sesión" ahora también es alcanzable en móvil (PR #82, merge `f274d32a359dbba8e401897a41294fda1f33cbf8`).
4. **No queda ningún pendiente conocido de identidad/infraestructura/UI básica.** La prioridad pasa por completo a construir el negocio: inventario, productos con precio en USD, tasa BCV y conversión a VES, ventas. No existe código de esto todavía.
5. Para agregar un usuario nuevo (más allá del primero), seguir el patrón SQL documentado en `docs/CURRENT_STATE.md` — hoy requiere inserciones manuales en Neon; considerar diseñar un flujo de invitación real antes de que se necesite de verdad.
6. Pendiente sin resolver, no bloqueante: revisar `feat/neon-transaction-adapter` contra `main` antes de cualquier merge.
7. Nota de entorno: en el sandbox de esta sesión, `pnpm install`/`npm` no pudieron resolver `registry.npmjs.org` por DNS; los cambios de frontend se verificaron exclusivamente vía los checks de GitHub Actions en el SHA exacto antes de fusionar.

---

## Handoff vigente — 2026-10-25 (tarde): login real funcionando, siguiente fase es negocio

1. Leer primero el checkpoint superior de `docs/CURRENT_STATE.md` (el bloque que empieza "Estado vivo — 2026-10-25 (tarde)"). Contiene los IDs exactos de la organización/usuario creados, el estado sellado de `auth_bootstrap`, y el patrón SQL exacto para agregar más correos a `auth_allowlist`.
2. El login con Google ya funciona en producción de extremo a extremo. Primera organización real: "Abasto 7 de Oro" (`abasto-7-de-oro`), owner `btfcasheb@gmail.com`. El bootstrap de un solo uso ya se consumió y no se puede volver a usar — es por diseño, no un bug.
3. PR #81 fusionada (`441bdc463954aba1069cfeae9227bf75a562a53a`): se reemplazó el formulario de contraseña muerto por un botón real "Continuar con Google" y mensajes de error claros (`?auth_error=...`). Todos los checks pasaron en el head exacto `117cb1c` antes de fusionar, incluido Playwright, que hubo que reescribir porque probaba el formulario eliminado.
4. **No asumir que agregar un correo a `auth_allowlist` alcanza para que esa persona entre.** Solo el primer login (vía bootstrap, ya sellado) puede crear `app_users`/`organization_members`. Para un segundo usuario real hace falta, hoy, una inserción manual adicional en esas tablas o — mejor — diseñar e implementar un flujo de invitación antes de que haga falta de verdad.
5. Confirmar primero con el usuario que `https://micro-app-63i.pages.dev/` carga el panel autenticado tras el redeploy de Cloudflare Pages (se disparó automáticamente al fusionar PR #81, pero no se verificó visualmente en esta sesión más allá de los checks de CI).
6. Con identidad resuelta, la prioridad del proyecto pasa a construir la lógica de negocio: inventario, productos en USD, tasa BCV/conversión a VES, ventas. No existe código de esto todavía.
7. Pendiente sin resolver, no bloqueante: revisar `feat/neon-transaction-adapter` contra `main` antes de cualquier merge (arrastrado desde hace varias sesiones).
8. Nota de entorno: en el sandbox de esta sesión, `pnpm install`/`npm` no pudieron resolver `registry.npmjs.org` por DNS pese a estar en `no_proxy`; si vuelve a pasar, verificar cambios de frontend exclusivamente vía los checks de GitHub Actions en el SHA exacto antes de fusionar, como se hizo aquí.

---

## Handoff vigente — 2026-10-22

1. Leer primero el checkpoint superior de `docs/CURRENT_STATE.md`.
2. PR #76 está integrada en `main` (merge `5f33e82fc7a6d3e77b6b97d912034f2a2ee7c2b0`). El workflow de Gitleaks con historial completo pasó en el SHA final y reportó 613 commits, ~1.74 MB y cero leaks encontrados: https://github.com/BTF14/Micro-app/actions/runs/39862510779. Los ocho checks del SHA también pasaron.
3. PR #74 está cerrada como supersedida; no reabrirla. Los cambios vigentes son los de PR #76.
4. PR #71 está integrada. `resolveTenantContext` solo valida sesión/membresía activa; no aplica permisos por operación ni se conecta todavía a handlers comerciales.
5. Issue P0 #53 registra el riesgo actual: registro deshabilitado, pero login por contraseña sigue activo sin comprobar Google sign-in/allowlist. Resolver D1–D8 antes de declarar autenticación lista; no inventar allowlist, proveedor, bootstrap o política de vinculación, y no deshabilitar login sin evaluar cuentas existentes.
6. La matriz `docs/sdd/role-permission-decision-matrix.md` continúa pendiente de aprobación. No implementar permisos comerciales por intuición.
7. GitHub informó `main` sin protección; la conexión no pudo leer/editar reglas administrativas. El propietario debe activar branch protection, required checks y opciones disponibles de secret scanning/push protection en Settings.
8. Arquitectura: Cloudflare Pages + Cloudflare Workers/Hono + Neon Free. No producción deploy, no Neon `main`, no billing ni secretos.

---


## Verificación más reciente — 2026-10-22 21:58 UTC

- En PR #71, head verificado `ef86738991fbed58090d191ffbb865e4e8f18588`: CI, Playwright E2E, migración PostgreSQL, Trivy, Semgrep, dashboard, Cloudflare Pages preview y Vercel Preview Comments terminaron success. Runs: CI https://github.com/BTF14/Micro-app/actions/runs/39861207434; E2E https://github.com/BTF14/Micro-app/actions/runs/39861207395; migration https://github.com/BTF14/Micro-app/actions/runs/39861207581; Trivy https://github.com/BTF14/Micro-app/actions/runs/39861207344; Semgrep https://github.com/BTF14/Micro-app/actions/runs/39861207331; dashboard https://github.com/BTF14/Micro-app/actions/runs/39861207369.
- El workflow E2E ejecutó `Run browser tests` y concluyó success. La corrección de CI de PR #75 está integrada en main.
- PR #71 sigue open/draft y sin merge. Revisar el alcance funcional/seguridad de `resolveTenantContext` antes de promoverla a revisión final. La función es actualmente una utilidad aislada; no aparece conectada a rutas en `apps/api/src/index.ts`.
- SHA anterior verificado: `ef86738991fbed58090d191ffbb865e4e8f18588`. Los commits documentales siguientes generan un nuevo head; consultar los checks del SHA vivo antes de cualquier decisión de merge.
- Límites: Cloudflare Pages + Cloudflare Workers/Hono + Neon Free; Vercel API auxiliar/no canónica; presupuesto $0; sin deploy de producción, sin cambios a Neon `main`, sin secretos expuestos.

---

## Handoff vivo — 2026-10-22: Playwright fix integrado; PR #71 pendiente de E2E

Leer primero el checkpoint más reciente al inicio de `docs/CURRENT_STATE.md`.

- PR #75 se fusionó en `main` por squash; commit `3a6d8211d21cc3fbbff2cd476d8fa80adb65cd3f`. Los seis workflows pasaron en `main`, incluido Playwright E2E.
- Se copió el workflow Playwright validado de `main` a `feat/tenant-context-resolver`, commit inicial `a3301896c2936ce6d50698a0d05ad920e656fe7a`, para que PR #71 ejecute la nueva configuración.
- En ese head, CI, migración, Trivy/security scan, Semgrep y dashboard pasan. Playwright [39861076113](https://github.com/BTF14/Micro-app/actions/runs/39861076113) pasó el paso de verificación de Chromium y seguía ejecutando los browser tests en la última consulta. Confirmar conclusión final antes de marcar E2E como verde.
- PR #71 sigue open/draft. No fusionar hasta revisar el resultado E2E y el diff final del resolver. La utilidad `resolveTenantContext` no aparece conectada a rutas en `apps/api/src/index.ts`; confirmar que esto concuerda con el alcance previsto y no añadir autorización implícita.
- No se identificó un séptimo workflow distinto: seis workflows Actions y dos contextos Vercel observados. No inventar un check faltante.
- Arquitectura canónica: Cloudflare Pages + Cloudflare Workers/Hono + Neon Free. Vercel API es auxiliar/no canónica. No deploy de producción, no tocar Neon `main`, sin billing ni secretos expuestos. Presupuesto $0.

---

## Handoff vivo — 2026-10-22: Playwright fix passed on PR #75

Leer el checkpoint más reciente al inicio de `docs/CURRENT_STATE.md`.

- GitHub Actions ya ejecuta jobs en runners tras hacer público el repositorio.
- PR #71 (`feat/tenant-context-resolver`) tiene CI, PostgreSQL migration, Semgrep, Trivy y progress dashboard pasados sobre el head anterior; Playwright falla en el workflow antiguo al instalar Chromium/dependencias. Los logs del job son inaccesibles (`404 BlobNotFound`), por lo que no se inventó causa raíz.
- Se creó PR draft #75 [ci: stabilize Playwright browser setup](https://github.com/BTF14/Micro-app/pull/75), solo workflow. Usa imagen oficial Playwright `v1.55.0-noble`, con browser y dependencias preinstalados. Todos sus seis workflows pasaron sobre SHA `09bc000d07672f731935d2bbc9e8b38f605eeb9d`, incluido Playwright E2E; enlace de E2E: https://github.com/BTF14/Micro-app/actions/runs/39859323412.
- Mantener #75 draft hasta revisión; no se ha fusionado. Tras integrar la corrección de workflow, volver a verificar los checks de #71 en su SHA final y solo entonces considerar sacar #71 de draft. No mezclar el cambio de CI dentro del resolver.
- No se identificó un séptimo workflow distinto: los raw check-runs de la revisión muestran seis workflows Actions relevantes y dos checks Vercel exitosos. No inventar un séptimo nombre.
- Arquitectura canónica: Cloudflare Pages frontend + Cloudflare Workers/Hono API + Neon Free. Vercel API auxiliar/no canónica; no deploy de producción ni cambios a Neon `main`.
- Límites: coste $0, no exponer secretos, no migrar datos reales, no fusionar PRs sin revisar el estado de checks.

---
## Handoff vivo — 2026-10-22: GitHub Actions ejecuta jobs

Leer primero el checkpoint más reciente al inicio de `docs/CURRENT_STATE.md`. Repo público; runners ya ejecutan steps.

- En PR #71, SHA base de esta revisión `8d938ab5726d357bd9f9f79385af54bbd42c4f2f`: CI (build/typecheck/unit/auth integration), PostgreSQL migration validation, Semgrep, Trivy y project progress dashboard pasaron en reintentos reales. Links e IDs están en `CURRENT_STATE.md`.
- El único workflow relevante que permanece fallando es Playwright E2E run [39426320240](https://github.com/BTF14/Micro-app/actions/runs/39426320240), intento 3. Falla en `Install Chromium and OS dependencies`; los tests del navegador ni siquiera arrancan. Logs del job retornan 404 `BlobNotFound`, por lo que no se conoce la causa interna. No hacer reruns en bucle ni cambiar el workflow a ciegas. Próximo trabajo: recuperar salida del paso; si la API de logs sigue devolviendo 404, ajustar el entorno de browser de forma reproducible en una rama de CI separada y probarlo antes de mezclarlo con PR #71.
- La causa del histórico de siete errores no se inventa: raw check-runs en el SHA consultado muestran seis workflows Actions relevantes más dos contextos Vercel exitosos; un run viejo duplicado de Security scan falló, mientras el run PR más reciente pasó.
- Mantener PR #71 draft hasta resolver E2E y verificar checks en el head final. No fusionar sin revisión.
- Arquitectura aprobada: Cloudflare Pages frontend + Cloudflare Workers/Hono API + Neon Free. Vercel API es auxiliar/no canónica; no arreglar el error ESM de Vercel mediante cambios de arquitectura o deploy a producción sin decisión explícita.
- Restricciones: $0, no deploy de producción, no tocar Neon `main`, no exponer secretos, no ejecutar migraciones con datos reales.

---
## Handoff actualizado — revisión viva 2026-10-20 08:56 EDT / 12:56 UTC

La evidencia detallada y la tabla de workflows están al inicio de `docs/CURRENT_STATE.md`. Se actualizó ese archivo en esta misma rama mediante commit `e2d9812e2406969f2e0bf6b32dbc6040f108b8e1`; el head de la rama ahora habrá avanzado, por lo que vuelve a consultarlo antes de actuar.

- Al comenzar la revisión, `main` seguía en `832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e`; PR #71 abierta/draft, head `f0f489fc6ac2f5ada84105610ae3eb0e1ff286e2` (ya no `a4806b6...`). PR #68 y #69 siguen abiertas no-draft; PR #70 sigue abierta draft. SHA exactos registrados en CURRENT_STATE.
- Sobre el head actual consultado, se recuperaron seis workflows fallidos: Project progress dashboard, Database migration validation, CI, Semgrep SAST, Security scan y Playwright E2E. Cada job expuesto reporta `steps: []`; las descargas de logs para los seis job IDs actuales devuelven 404 `BlobNotFound`. La causa de no inicio/asignación del runner no está demostrada. El usuario reporta siete errores, pero el conector no permitió identificar el séptimo; no adivinar. El combined status solo expone dos contextos Vercel en success, no los check-runs de Actions.
- El comentario de diagnóstico anterior sigue presente en PR #71; no se duplicó. No hacer más reruns sin evidencia nueva. Mantener la PR en draft hasta que los jobs ejecuten steps y exista CI real verificable.
- Vercel: la API preview del SHA `f0f489f...` está `READY`, pero no se verificó con petición HTTP. El deployment de producción anterior tenía `ERR_MODULE_NOT_FOUND` al importar `/var/task/apps/api/src/auth`; la ventana de logs histórica de 7 días no es accesible en el plan/retención actual. Una consulta reciente no encontró logs de error, lo cual no certifica runtime sano. El listado de envs devolvió vacío pero no prueba ausencia total de variables.
- Arquitectura canónica en la Constitución y `apps/api/wrangler.toml`: frontend Cloudflare Pages, API Cloudflare Workers + Hono, Neon Free, coste $0. No existe `vercel.json` en raíz ni `apps/api/vercel.json` en refs consultados. Mantener Workers como destino de API; no cambiar configuración Vercel ni desplegar producción a ciegas. La incompatibilidad interna exacta del builder Vercel sigue como hipótesis, no causa raíz probada.
- No se cambió código de aplicación ni configuración de Vercel; solo se documentó evidencia. No se ejecutaron tests/build locales reales, no se desplegó producción, no se alteró Neon `main`, no se ejecutaron migraciones ni se expusieron secretos.

### Siguiente secuencia

1. Verificar el nuevo head después de las actualizaciones documentales y volver a consultar runs/checks para ese SHA.
2. Recuperar el séptimo check mediante el listado raw de check-runs de GitHub (no disponible en el conector consultado). Si se comparte una URL/captura, registrar nombre y conclusión sin repetir comentarios innecesarios.
3. Obtener runner metadata/raw logs cuando estén disponibles; distinguir fallo de infraestructura de tests no ejecutados.
4. No modificar el resolver, OAuth/allowlist, permisos, Neon ni configuración de Vercel para intentar ocultar checks. Ejecutar la suite real cuando haya un checkout/runner funcional.
5. Tratar Vercel API como auxiliar/no destino comercial hasta decisión arquitectónica explícita; la arquitectura documentada es Cloudflare Workers + Hono.

---
## Handoff urgente — 2026-10-20: PR #71 + fallo runtime Vercel

Leer el checkpoint nuevo al inicio de docs/CURRENT_STATE.md; incluye SHA/URLs, seis workflows identificados, nota del séptimo check que el usuario ve, evidencia de jobs sin runner/steps, smoke harness aislado, fallo exacto de runtime de Vercel y próximos pasos. PR #71 sigue draft; no mergear. No desplegar producción ni cambiar Neon main.

Prompt para continuar:
> Continúa Micro app desde el checkpoint del 2026-10-20 en docs/CURRENT_STATE.md. Verifica el estado vivo de GitHub/PR #71 y los checks del SHA actual (el usuario reporta siete errores; documenta el séptimo si se identifica). No confundas jobs que fallan antes de steps con tests fallidos. Después investiga la API Vercel: runtime error ERR_MODULE_NOT_FOUND para /var/task/apps/api/src/auth importado desde index.js; revisa entrypoint/build y arquitectura Cloudflare Workers antes de corregir. Trabaja en rama/PR, reproduce el problema y verifica el arreglo. No despliegues producción, no cambies Neon main, no expongas secretos, mantén coste $0 y no inventes políticas OAuth/allowlist/roles pendientes.

---
## Estado prioritario de continuidad — 2026-10-19, después de PR #64

- Repositorio canónico: https://github.com/BTF14/Micro-app.
- `main` incluye PR #64, merge SHA `f15e3b0da415b8f31641a81ed8a883deb7fcfc5f`; PR #63 merge SHA `b4b417ec5a85b8b0c48b606c718c341745af9055`.
- PR #63 tuvo siete workflows success en su head exacto; PR #64 tuvo seis workflows success en su head exacto: CI, Playwright E2E, Security scan, Semgrep SAST, migration validation y progress dashboard. No se ejecutaron tests locales.
- PR #60 se cerró como supersedida tras comparar el diff: sus reglas útiles de autonomía están en PR #62/#63; el bloque de handoff histórico no se reintrodujo porque sus SHA/estados eran obsoletos. No se hizo force-push ni merge directo.
- PR #64 añadió skills locales `.agents/skills/micro-app-auth-security/SKILL.md`, `micro-app-postgres-testing/SKILL.md`, `micro-app-stack-guidance/SKILL.md` y `micro-app-skill-curation/SKILL.md`; guía en `docs/AUTOSKILLS_ADOPTION.md`. Son skills propias del proyecto, no paquetes oficiales instalados desde AutoSkills.
- AutoSkills se investigó, pero la CLI no se ejecutó: el shell no pudo resolver `github.com` al intentar preparar un checkout. No afirmar que la instalación oficial ocurrió ni que existe un lockfile de hashes. Repetir `npx autoskills --dry-run` en un checkout con red y revisar cada skill antes de instalar.
- P0: Google OAuth + allowlist sigue sin implementar; D1–D8 y matriz de roles pendientes. Registro fail-closed; el login por contraseña aún existe y no debe suponerse protegido por allowlist.
- Límites: $0; sin producción, Neon `main`, datos reales, secretos, emails, billing ni Cantina-pos. La app no está lista para producción.

## Próximas acciones
1. Repetir AutoSkills dry-run cuando haya conectividad y seleccionar solo skills relevantes/licenciadas/hash-verificadas.
2. Continuar auth/sesión y aislamiento multiempresa con pruebas sintéticas; no inventar decisiones pendientes.
3. Revisar `feat/neon-transaction-adapter` contra `main` sin merge ciego.
4. Verificar cada PR/check sobre el SHA final y mantener el diario actualizado.

---

## Estado prioritario de continuidad — 2026-10-19, después de PR #62

- Repositorio canónico: https://github.com/BTF14/Micro-app.
- PR #61 fusionada; merge SHA reportado `1b8098ff00e0bb7482200b486710a5611f1e109d`.
- PR #62 fusionada; merge SHA `d107cfb2b80c4165ed39e3071f8256942898ffb7`; head final `9f288f68b6012f39b8ec7928b07a140b869e63cb`. Los siete workflows de ese head terminaron `success`: CI, Playwright E2E, SDD/agent docs, progress dashboard, Security scan, Semgrep SAST y migration validation. Cambio documental únicamente.
- PR #60 sigue abierta con conflicto (`mergeable=false`), head `af8479000e1e677bd84e0e11bf02cdb6d548315e`. No force-push ni merge directo. PR #62 integró los principios básicos de autonomía; esta PR #63 amplía los criterios operativos detallados que no se portaron íntegramente. No fusionar PR #60 original con conflictos.
- Codex no dejó hilos inline recuperables para PR #60 y la revisión de su SHA antiguo falló por cuota. PR #62 recibió una observación P2 de checkpoint obsoleto en su head inicial; se corrigió en el head final actualizando `CURRENT_STATE.md` y `HANDOFF_NEXT_CHAT.md`.
- P0: Google sign-in + allowlist sigue sin implementar; D1–D8 y matriz de permisos por rol siguen pendientes. `POST /auth/register` debe permanecer fail-closed. La ruta de login por contraseña continúa en código; no asumir que la política de allowlist ya la protege.
- No inventar correos, dominios, bootstrap de admin, proveedor OAuth ni política de vinculación. No tocar producción, Neon `main`, datos reales, secretos, emails, billing ni Cantina-pos. Presupuesto $0; aplicación no lista para producción.
- `feat/neon-transaction-adapter` sigue divergida y no debe fusionarse a ciegas. Strix está documentado, no instalado ni ejecutado.
- No se ejecutaron tests locales. Los workflows del head final de PR #62 fueron satisfactorios; no son prueba de readiness de producción.

## Próximos pasos
1. Comparar la PR #60 contra el contenido integrado por PR #62; si queda contenido útil, crear PR nueva desde `main` sin force-push.
2. Hacer análisis/test aislado de auth y sesión sin elegir decisiones pendientes.
3. Actualizar SHA y checks de continuidad tras cada cambio.

---

## Estado prioritario de continuidad — 2026-10-19 (revalidar antes de actuar)

- Repositorio canónico: https://github.com/BTF14/Micro-app.
- PR #61 está fusionada; merge SHA reportado: `1b8098ff00e0bb7482200b486710a5611f1e109d`. El cambio fue documental, no despliegue de producción.
- PR #60 (`docs/ai-autonomy-governance`) sigue abierta con head `af8479000e1e677bd84e0e11bf02cdb6d548315e`; `mergeable=false`. Se consultaron siete workflows del head exacto y todos terminaron `success`: CI, Security scan, Playwright E2E, Database migration validation, Project progress dashboard, Semgrep SAST y SDD/agent documentation validation. El comentario de Codex marca `failed` y cuota agotada para un SHA antiguo (`1b7f576c38aa869ca8c17b749c7c35d473404ef8`); no hay review threads ni reviews formales recuperados. No inferir cuáles eran los hallazgos.
- Para evitar force-push, se creó `docs/ai-autonomy-governance-rebased` desde `main` y se abrió la PR #62: https://github.com/BTF14/Micro-app/pull/62. La PR contiene seis cambios documentales re-aplicados sobre la base actual. El head `ff1d6926da478c2ad0c38e2aca7d29b8903fca76` tuvo siete workflows en `success` y `mergeable=true`; después se actualizó el checkpoint para registrar ese resultado, lo cual generó un nuevo head. Revalidar SHA, diff y los checks de ese nuevo head antes de integrar. No fusionar la #60 original con conflictos.
- P0: Google sign-in + allowlist sigue sin implementar; D1–D8 y matriz de permisos siguen pendientes de aprobación. `POST /auth/register` debe permanecer fail-closed. No inventar correos, dominios, bootstrap de admin, proveedor OAuth ni política de vinculación.
- La rama `feat/neon-transaction-adapter` sigue sin fusionarse a ciegas; solo rescatar cambios concretos tras comparación con el `main` vigente.
- Coste $0; no despliegues de producción, Neon `main`, datos reales, secretos, emails, billing ni mezcla con Cantina-pos. App no lista para producción. Strix está documentado, no instalado ni ejecutado.
- Próximo paso: revisar la nueva PR de gobernanza y sus checks; después hacer análisis/test aislado de auth/sesión sin escoger políticas pendientes y actualizar `CURRENT_STATE.md` con SHA real de `main` una vez obtenido por evidencia.

---

## Estado vivo — 2026-10-19 después de PR #57

Revalidar GitHub antes de actuar; este bloque prevalece sobre snapshots históricos inferiores.

- `main`: `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe`.
- PR #57 fusionada: el registro público devuelve `503 REGISTRATION_DISABLED` después de validar Origin, antes de procesar credenciales o acceder a la base de datos. Tests unitarios e integración PostgreSQL verifican que no hay escrituras ni cookie y preservan login/sesión con fixtures sintéticos.
- Checks del head exacto de PR #57 `71d3e6d3ffe625b12807e9942ddd261e222cf093` en success, y checks consultados del merge SHA también en success. No se ejecutaron pruebas localmente.
- Preview reportada por Cloudflare: https://1d3d60bf.micro-app-63i.pages.dev; el check no acredita despliegue productivo.
- Issue P0 #53 sigue abierto hasta implementar Google sign-in + allowlist y resolver D1–D8. No reactivar el registro ni inventar identidad.
- `feat/neon-transaction-adapter`: divergida, 14 commits ahead / 76 behind; no fusionar a ciegas. Los únicos cambios aparentes son tests antiguos/script de test y documentación obsoleta; `database.ts` y security workflow ya son idénticos a main.
- Matriz de roles sigue pendiente; no crear endpoints comerciales que dependan de permisos no aprobados.
- App no lista para producción. Leer `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, este handoff, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md` y documentos de dominio.
- Continuar autónomamente con cambios pequeños y reversibles. No secretos, emails, billing, datos reales, Neon main, despliegue productivo ni Cantina-pos. Strix documentado, no instalado/ejecutado. Coste $0.

---

## Estado vivo — 2026-10-19 después de PR #55

Este bloque prevalece sobre snapshots históricos inferiores. Revalidar GitHub en cada sesión.

- `main`: `b7117f8aeb868e25c49db86a524405511cd3c9be`; PR #55 fusionada.
- Head exacto probado de PR #55: `a4e51ec10bcbc0ac786bb3e518d50de9ec7eee28`; los 8 check-runs observados terminaron en success. Cloudflare Pages fue preview de rama; no producción. No se ejecutaron pruebas locales ni se verificó independientemente el merge SHA.
- No hay PR abiertas en la consulta actual.
- Issue P0 #53 está abierto: el registro público no tiene una política Google + allowlist demostrada y crea usuario, organización, membresía owner y sesión. No afirmar que ya esté bloqueado.
- D1–D8 de identidad y matriz de permisos pendientes de decisión humana. No inventar reglas.
- Continuar autónomamente con cambios seguros, pequeños, reversibles y verificables. Revisar AGENTS.md, docs/CONSTITUTION.md, docs/CURRENT_STATE.md, este handoff, docs/PROJECT_PLAN.md, docs/STATE_JOURNAL.md y documentos de dominio.
- Próximo trabajo: análisis estático y pruebas aisladas de auth/sesión/autorización que no seleccionen políticas pendientes; revisar la rama feat/neon-transaction-adapter contra main sin merge ciego.
- No producción, no mutar Neon main sin gates, no secretos, emails, billing, datos reales ni Cantina-pos. Strix documentado solamente. Presupuesto objetivo $0. La app no está lista para producción.
- Para continuar el bloqueado de identidad, el usuario debe aprobar las decisiones D1–D8 y la matriz de roles; pedirlas de forma concreta y con recomendaciones explícitas.

---

## Estado vivo — 2026-10-19 después de PR #51

Usa este bloque antes que snapshots históricos inferiores y revalida GitHub antes de actuar.

- `main`: `e18a3ec267f4c4d0e02678a4c0522dabf200ac98`. PR #50 y #51 fusionadas; PR #49 actualizó documentación tras #48.
- Los seis workflows pasaron en los heads exactos de PR #50 (`dcad8d6d1caf6db3aabbc95465e5983ad0014746`) y PR #51 (`92ea991d6333bcd1b05943f679fdd36777ab6a8f`). No se ejecutaron tests locales ni se verificaron workflows sobre merge SHA.
- Continuar autónomamente con cambios pequeños y reversibles. Leer `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, este handoff, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md` y documentos de dominio.
- Próximo foco: autorización server-side y aislamiento tenant. Revisar handlers reales antes de añadir pruebas de negocio; no inventar endpoints inexistentes.
- No implementar OAuth/allowlist ni elegir D1–D8 o permisos por suposición. No desplegar producción ni mutar Neon `main`; no secretos, correos, billing, datos reales ni Cantina-pos. La app no está lista para producción.

---

## Estado vivo — 2026-10-19 después de PR #48

Usa este bloque antes que snapshots históricos inferiores y revalida GitHub antes de actuar.

- `main`: `420a64152103c90d2990d47c72fc19a744786fa6`. PR #48 y PR #47 fusionadas; PR #46 actualizó la continuidad.
- Los seis workflows pasaron en los heads exactos de PR #47 (`7939d11678cfd1a2bb8fac22664096663603c824`) y PR #48 (`6acb78018a47eb39f74dab079b53b51b4cacf11f`). No se ejecutaron tests locales ni se verificaron workflows en los merge SHA.
- Continuar autónomamente con cambios pequeños, reversibles y verificables. Leer `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, este handoff, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md` y los documentos de dominio.
- Próximo foco: autorización server-side y aislamiento tenant. Inspeccionar handlers reales antes de añadir pruebas de negocio; no inventar endpoints inexistentes.
- No implementar OAuth/allowlist ni elegir políticas D1–D8 o permisos por suposición. No desplegar producción ni mutar Neon `main`; no secretos, correos, billing, datos reales ni Cantina-pos. La app no está lista para producción.

---

## Estado vivo — 2026-10-19 después de PR #45

Usa este bloque antes que snapshots históricos inferiores y revalida GitHub antes de actuar.

- `main`: `1c6ecf6a4586ab1252a43210672e123975f8941f`; PR #45 fusionada: https://github.com/BTF14/Micro-app/pull/45.
- Los seis workflows de Actions pasaron en el head exacto `cdce44a9643c5134311f9603abf1248c07970df3`; no se ejecutaron pruebas localmente ni se verificó el merge SHA con workflows.
- Continuar autónomamente con cambios pequeños y reversibles. Leer `AGENTS.md`, `docs/CONSTITUTION.md`, este handoff, `docs/CURRENT_STATE.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md` y documentos de dominio antes de modificar.
- Próximo foco: pruebas acotadas de auth/sesión y límites de autorización. Inspeccionar handlers reales antes de proponer pruebas de negocio; no inventar endpoints inexistentes.
- No implementar OAuth/allowlist ni elegir políticas D1–D8 o permisos por suposición. No desplegar producción ni mutar Neon `main`; no secretos, correos, billing, datos reales ni Cantina-pos. No declarar la app lista para producción.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #41

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `3313bf4276563c6cdac52aa7902fa9ea36558014` — https://github.com/BTF14/Micro-app/commit/3313bf4276563c6cdac52aa7902fa9ea36558014
- PR #41 fusionada: https://github.com/BTF14/Micro-app/pull/41. Cambio: prueba de regresión para que el endpoint de logout no borre la cookie de sesión si falla la revocación del lado del servidor.
- Head exacto probado por GitHub Actions: `0c55c180846e6286e72d35f51e502278200ee0de`. Los seis workflows fueron `success`: CI (39244454840), Playwright E2E (39244454807), Security scan (39244454911), Semgrep SAST (39244454934), Project progress dashboard (39244454952) y Database migration validation (39244456648).
- Merge SHA: `3313bf4276563c6cdac52aa7902fa9ea36558014`. La consulta de workflows asociada al merge SHA no devolvió runs porque el conector filtra a eventos de PR; no afirmar que los seis workflows del merge SHA estén verificados. No se ejecutaron pruebas locales.
- Cambio acotado: solo `apps/api/src/index.test.ts`, 24 líneas añadidas. Usa una URL de base de datos sintética inválida; no contacta ni modifica una base real.
- No se tocaron secretos, billing, datos reales, Neon `main`, producción ni Cantina-pos.
- Strix (`https://github.com/usestrix/strix.git`) continúa documentado, no instalado ni ejecutado.
- Estado del producto: **NO listo para producción**. Persisten endpoints comerciales incompletos, decisiones de identidad D1–D8 pendientes, matriz de permisos por aprobar, aislamiento multiempresa y flujos reales API+PostgreSQL por validar, idempotencia/concurrencia, requisitos fiscales y backup/restauración independiente por verificar.
- Rama `feat/neon-transaction-adapter`: divergida y desactualizada; no fusionar a ciegas. Recuperar solo cambios puntuales tras comparar con `main`.
- Siguiente paso: continuar con pruebas pequeñas de auth/sesión/autorización sin inventar políticas pendientes; mantener CI verificado por SHA exacto y coste objetivo $0. No desplegar producción ni mutar Neon `main` sin superar los gates documentados.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #39

## Estado verificado en GitHub

- Repositorio: https://github.com/BTF14/Micro-app
- HEAD de `main`: `50c530084f8ce402d897962cbc7c4354c512e847` — https://github.com/BTF14/Micro-app/commit/50c530084f8ce402d897962cbc7c4354c512e847
- PR #39, prueba de que el error original de operación sobrevive cuando también falla el cierre del cliente: fusionada — https://github.com/BTF14/Micro-app/pull/39. Head probado: `134c9e14a5224d83c5f280dc501ae113d374c159`; merge SHA: `50c530084f8ce402d897962cbc7c4354c512e847`.
- Los seis workflows terminaron en `success` para el head exacto de PR #39 `134c9e14a5224d83c5f280dc501ae113d374c159`: CI (run 39243670711), Project progress dashboard (39243670742), Playwright E2E (39243670784), Database migration validation (39243670921), Semgrep SAST (39243670843) y Security scan (39243670950).
- PR #38 también está fusionada: https://github.com/BTF14/Micro-app/pull/38; merge SHA `bdf340a0e7157b6398b498fabedc3a8e2158b9c4`. Sus seis workflows fueron `success` en el head exacto `527dd7cc62bcceae891add8100875cc395dd5cfa`.
- No se ejecutaron pruebas locales. Los resultados indicados son de GitHub Actions sobre los head SHA especificados. No se han verificado aquí workflows para el merge SHA de PR #39; no afirmar que el merge SHA esté completamente verde.
- No se desplegó producción, no se modificó Neon `main`, no se tocaron datos reales, secretos, facturación ni Cantina-pos.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado solamente; no instalado ni ejecutado.
- Automatización diaria de continuidad creada previamente con ID `6ad4c8ce247881919e0c4e83e7358dcb`; verificar su estado en la plataforma si se necesita afirmar que está activa/ejecutándose. No es un bucle continuo en tiempo real.

## Estado funcional y bloqueos

La aplicación **NO está lista para producción**. Continúan pendientes: rutas comerciales completas para catálogo/proveedores/inventario/ventas/pagos/devoluciones/reportes; Google OAuth, allowlist y verificación de correo según las decisiones D1–D8 aún no aprobadas; matriz de permisos por rol; aislamiento multiempresa validado en todos los endpoints; pruebas reales de API + PostgreSQL para flujos de negocio; idempotencia y concurrencia de ventas/stock; cumplimiento fiscal; backups independientes y restauración ensayada; preview aislada y aprobación de lanzamiento.

## Próximos pasos

1. Continuar con pruebas de auth/sesión de alcance acotado sin inventar políticas de identidad o roles.
2. Revisar la rama `feat/neon-transaction-adapter` contra el `main` actual antes de cualquier decisión; no fusionarla a ciegas.
3. Mantener cambios pequeños en ramas/PR; exigir CI exitoso para el head SHA exacto y revisar diffs/reviews antes de merge.
4. Mantener el presupuesto objetivo en $0. No desplegar producción ni mutar Neon `main` hasta satisfacer los gates de `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.
5. Corregir esta documentación al cerrar hitos; no usar snapshots históricos como evidencia del estado actual.

---

# Checkpoint de continuidad — 2026-10-19, después de PR #36

## Estado verificado

- Repositorio: https://github.com/BTF14/Micro-app
- HEAD de `main`: `c15c2364cd19e55ac10b2331300e7a9f4b89813f` — https://github.com/BTF14/Micro-app/commit/c15c2364cd19e55ac10b2331300e7a9f4b89813f
- PR #35, checkpoint documental tras PR #34: fusionada — https://github.com/BTF14/Micro-app/pull/35. Merge SHA: `f2fdd532fb67dd98f31eb02b99bbe326945cabb0`.
- PR #36, validación estricta de hashes PBKDF2: fusionada — https://github.com/BTF14/Micro-app/pull/36. Head SHA probado por CI: `cf432de6d5e8752181bc1105e9d0e91384d5936c`; merge SHA: `c15c2364cd19e55ac10b2331300e7a9f4b89813f`.
- PR #36 cambió `apps/api/src/auth.ts` para rechazar hashes con campos `$` adicionales y valores de iteraciones no canónicos; añadió regresiones en `apps/api/src/auth.test.ts`.
- Los seis workflows de PR #36 terminaron en `success` para el head exacto `cf432de6d5e8752181bc1105e9d0e91384d5936c`:
  - CI: https://github.com/BTF14/Micro-app/actions/runs/39241705903
  - Playwright E2E: https://github.com/BTF14/Micro-app/actions/runs/39241706090
  - Security scan: https://github.com/BTF14/Micro-app/actions/runs/39241705951
  - Semgrep SAST: https://github.com/BTF14/Micro-app/actions/runs/39241706070
  - Database migration validation: https://github.com/BTF14/Micro-app/actions/runs/39241705989
  - Project progress dashboard: https://github.com/BTF14/Micro-app/actions/runs/39241706068
- Los seis jobs consultados tras PR #34 (run IDs 39241150482, 39241150423, 39241150283, 39241150291, 39241150500 y 39241150556) reportaron `success`. La consulta disponible no devolvió metadatos suficientes para vincular cada run al SHA de merge `02c7cd61ef2e94545849746885dede12b2df7767`; no afirmar que ese SHA tiene checks confirmados hasta verificarlo por otro medio.
- No se ejecutaron pruebas locales en esta sesión. La evidencia de tests es GitHub Actions sobre el head de PR #36, no una ejecución local.
- No se desplegó producción ni se modificó Neon `main`; no se tocaron datos reales, secretos, billing ni Cantina-pos.

## Bloqueos de producto

- La aplicación NO está lista para producción: todavía no se ha verificado la implementación completa de rutas comerciales para catálogo, proveedores, inventario, ventas, pagos, devoluciones y reportes.
- Google OAuth, allowlist y verificación de correo no están implementados en el código revisado. Las decisiones D1–D8 siguen pendientes de aprobación; no inventar proveedor, política ni flujo de cuentas.
- La matriz de permisos por rol sigue pendiente de aprobación. No crear rutas comerciales asumiendo permisos.
- Playwright cubre smoke tests con API simulada; faltan pruebas E2E reales de API + PostgreSQL para flujos comerciales.
- Backups independientes y restauración real siguen sin verificarse. Revalidar protección de `main`; no asumir que está activada.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado solamente; no instalado ni ejecutado.

## Próximas acciones

1. Verificar los checks del SHA de merge `c15c2364cd19e55ac10b2331300e7a9f4b89813f` y registrar evidencia exacta si la plataforma la expone.
2. Continuar con pruebas de seguridad/auth de alcance pequeño, sin cambiar decisiones de identidad o permisos pendientes.
3. Mantener cambios en ramas + PR y esperar CI en el head SHA exacto antes de fusionar.
4. Actualizar este checkpoint y los documentos de estado tras cada cambio significativo.
5. Mantener coste objetivo $0. No desplegar producción ni mutar Neon `main` hasta satisfacer los gates y autorizaciones requeridos por `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.

# Checkpoint autoritativo — 2026-10-19, después de PR #31

> Revalidar GitHub en cada sesión antes de actuar; este bloque es un punto de partida, no sustituto de la verificación viva.

- Repositorio canónico: https://github.com/BTF14/Micro-app
- `main` verificado: `31d1a09a9ba9bf41a797fea7c442f5d9e2223c56` — https://github.com/BTF14/Micro-app/commit/31d1a09a9ba9bf41a797fea7c442f5d9e2223c56.
- PR #30 (matriz de decisiones de permisos por rol, todas pendientes de aprobación): https://github.com/BTF14/Micro-app/pull/30, fusionada.
- PR #31 (pruebas de sesiones/login cuando la organización está inactiva): https://github.com/BTF14/Micro-app/pull/31, fusionada; head de PR `cfb9f82a497b35aa5a27a4a9ea78476692cf254d`.
- Comprobación viva de Actions para el SHA exacto de main: 8 check-runs visibles: 6 success y 2 in_progress al momento de esta consulta; volver a verificar antes de declarar CI completamente verde.
  - Trivy filesystem and configuration scan: in_progress — https://github.com/BTF14/Micro-app/actions/runs/39176217202/job/117819320792
  - Cloudflare Pages: in_progress — https://github.com/BTF14/Micro-app/runs/117819318705
  - Chromium authentication smoke tests: success — https://github.com/BTF14/Micro-app/actions/runs/39175964317/job/117818569851
  - Trivy filesystem and configuration scan: success — https://github.com/BTF14/Micro-app/actions/runs/39175964296/job/117818569814
  - generate-progress: success — https://github.com/BTF14/Micro-app/actions/runs/39175964326/job/117818569804
  - postgres-migration: success — https://github.com/BTF14/Micro-app/actions/runs/39175964294/job/117818569740
  - JavaScript and TypeScript static analysis: success — https://github.com/BTF14/Micro-app/actions/runs/39175964287/job/117818569696
  - verify: success — https://github.com/BTF14/Micro-app/actions/runs/39175964298/job/117818569670
- PR #32 (esta actualización documental) está abierta: https://github.com/BTF14/Micro-app/pull/32; sus checks deben verificarse para el head SHA vigente antes de fusionar.
- No se ejecutaron pruebas locales en esta sesión. El estado de CI es evidencia de GitHub Actions, no certifica preparación comercial.
- Código verificado: `apps/api/src/index.ts` registra auth y health; aún no hay handlers HTTP comerciales para catálogo/productos, proveedores, compras, ventas, pagos ni movimientos de inventario.
- Autenticación: existen registro/login con contraseña, `/auth/me` y logout; Google OAuth, allowlist y verificación de correo no están implementados en el código revisado. Las decisiones D1–D8 siguen sin aprobar. No cambiar el modelo de registro ni inventar reglas de acceso.
- Permisos: `docs/sdd/role-permission-decision-matrix.md` está fusionado, pero cada celda sigue pendiente. No construir rutas comerciales asumiendo permisos por rol.
- La rama de Neon adapter no debe fusionarse ciegamente; la revisión anterior encontró 14 commits propios y 49 detrás de main, sin código único que justificara la fusión completa.
- Neon `main`: no se modificó. Backups independientes y restauración real: no verificados. Protección de branch main: estaba desactivada en la última comprobación; verificar de nuevo y no modificar sin necesidad/autoridad clara.
- Strix (`https://github.com/usestrix/strix.git`) solo está documentado; no instalado ni ejecutado.
- Límites: coste objetivo $0; no mezclar Cantina-pos; no secretos, correos, billing, datos reales, mutaciones en Neon main ni despliegues de producción sin superar los gates de `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.

## Instrucciones obligatorias para la siguiente IA

1. Leer primero `AGENTS.md`, luego este checkpoint, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/CONSTITUTION.md`, `docs/PRODUCTION_READINESS.md` y `docs/BACKUP_AND_RECOVERY.md`.
2. Antes de cualquier cambio, comprobar en vivo el SHA de main, PR abiertas, checks del SHA exacto y estado de ramas. No usar los SHA históricos como evidencia actual.
3. Continuar autónomamente con cambios pequeños, reversibles y útiles; no pedir al usuario permisos ya concedidos. Documentar hallazgos y pruebas reales, sin afirmar que algo se ejecutó si solo se leyó el código.
4. Próxima prioridad técnica: diseñar el primer endpoint comercial solo después de obtener aprobación explícita de la matriz de roles; hasta entonces, revisar fallos de seguridad concretos, ampliar pruebas de infraestructura/auth sin cambiar la política de identidad, y preparar contrato/criterios de aceptación sin exponer rutas inseguras.
5. D1–D8 de identidad y matriz de permisos necesitan decisión del propietario. No inventar proveedor OAuth, allowlist, email/domains, bootstrap admin, vinculación de cuentas, permisos de roles ni fiscalidad.
6. No desplegar producción ni modificar Neon main hasta cumplir gates y recibir aprobación específica cuando corresponda. Mantener presupuesto $0 y no tocar datos reales.
7. Si la conversación se acerca al límite, actualizar este archivo, `docs/CURRENT_STATE.md`, `docs/STATE_JOURNAL.md` y `docs/PROJECT_PLAN.md` en una rama/PR; incluir SHA, PR/merge, checks exactos, cambios, tests ejecutados/no ejecutados, riesgos y siguiente acción concreta. Abrir PR y esperar CI; no declarar merge sin evidencia.
8. No detener el trabajo solo por falta de una respuesta de “ok”. Detenerse únicamente ante decisión de producto necesaria, riesgo alto o bloqueo real; explicar la decisión mínima requerida.

---

# Checkpoint autoritativo — 2026-10-18, después de PR #27

> **Esta sección prevalece sobre los snapshots históricos más abajo.** Verificar de nuevo GitHub antes de usar este estado en una sesión futura.

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `20c0dbda2a5c6b7de95e29efc1fee429de525b00` — https://github.com/BTF14/Micro-app/commit/20c0dbda2a5c6b7de95e29efc1fee429de525b00
- PR #27, [refresco del checkpoint después de PR #26](https://github.com/BTF14/Micro-app/pull/27), está fusionada. Head revisado: `29f899a52346d342067cf8e1b22850d35aa48a69`; los ocho check-runs visibles en ese head terminaron en `success`.
- Para el merge commit de `main`, los siete checks consultados terminaron en `success`: [Cloudflare Pages](https://github.com/BTF14/Micro-app/runs/117814356290), [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39174497033), [smoke tests Chromium auth](https://github.com/BTF14/Micro-app/actions/runs/39174496914), [Trivy](https://github.com/BTF14/Micro-app/actions/runs/39174496816), [verify/CI](https://github.com/BTF14/Micro-app/actions/runs/39174496864), [análisis JS/TS](https://github.com/BTF14/Micro-app/actions/runs/39174496812) y [migraciones PostgreSQL](https://github.com/BTF14/Micro-app/actions/runs/39174496820).
- No había PR abiertas en la consulta posterior al merge. No se ejecutaron pruebas locales en esta sesión; la evidencia indicada es de GitHub Actions para los SHA exactos.
- Estado del producto: **no listo para producción**. La API aún no registra handlers HTTP comerciales para productos, proveedores, ventas, pagos ni movimientos de inventario. La matriz de aislamiento es un plan de aceptación, no evidencia de controles en rutas inexistentes.
- Bloqueos: Google OAuth + allowlist y decisiones D1–D8 siguen pendientes de aprobación; roles/permisos por operación deben definirse antes de añadir rutas de negocio; no se han verificado backups/restauración independiente; la protección de `main` estaba desactivada en la última comprobación.
- Límites mantenidos: presupuesto $0, proyecto independiente de Cantina-pos, sin secretos ni correos, sin cambios a Neon `main`, sin despliegue de producción. Strix sigue documentado, no instalado ni ejecutado.
- Próximo paso seguro: continuar la revisión del adaptador Neon sin merge ciego y preparar una matriz explícita de permisos por rol para que el primer endpoint comercial tenga pruebas positivas y negativas de aislamiento; no inventar políticas pendientes.

---

# Checkpoint autoritativo — 2026-10-18, después de PR #26

> **Esta sección prevalece sobre todos los snapshots históricos más abajo.** Los SHA, estados de PR y enlaces de Actions antiguos que aparezcan en el resto de este archivo no representan el estado vivo actual salvo que coincidan con una verificación nueva de GitHub.

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `a3cc3ae7533510baf2502a3f553030c2c8505a4c` — https://github.com/BTF14/Micro-app/commit/a3cc3ae7533510baf2502a3f553030c2c8505a4c
- PR #24 (matriz de aislamiento tenant), PR #25 (refresco documental) y PR #26 (checkpoint documental) están fusionadas.
- PR #26: https://github.com/BTF14/Micro-app/pull/26; head `a5576ae3db9b606bbb69fa3c7f34006e6585934e`; sus siete workflows consultados terminaron en `success`.
- Para el SHA exacto de `main` `a3cc3ae7533510baf2502a3f553030c2c8505a4c`, los seis workflows consultados terminaron en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39133032751), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39133032760), [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39133032817), [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39133032755), [validación de migraciones](https://github.com/BTF14/Micro-app/actions/runs/39133032686) y [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39133032670).
- No hay PR abiertas en la consulta actual. No se desplegó producción ni se modificó Neon `main`.
- Estado de producto: **no listo para producción**. `apps/api/src/index.ts` todavía no registra handlers HTTP de negocio para catálogo/productos, proveedores, ventas, pagos o movimientos de inventario; la matriz de tenant define criterios futuros, no evidencia de endpoints ya protegidos.
- Bloqueos: Google OAuth + allowlist y decisiones D1–D8 pendientes de aprobación; backups/restauración independiente no verificados; protección de rama `main` desactivada en la última verificación; faltan flujos POS/inventario reales y pruebas de autorización completas.
- Límites: presupuesto $0, no mezclar con Cantina-pos, no secretos ni correos, no migraciones a Neon `main` sin superar el gate de `docs/CONSTITUTION.md`, no despliegue de producción sin aceptación explícita.
- Próximo trabajo seguro: abordar identidad solo tras resolver D1–D8; mientras tanto, ampliar cobertura de autorización y preparar endpoints de negocio en entorno aislado, sin inventar políticas de registro ni OAuth.

---


# Checkpoint más reciente — 2026-10-18

## Estado vivo después de fusionar PR #24

- `main` verificado en `69032a333b52ee10099c0347be3443e18f4dc4df`: [commit](https://github.com/BTF14/Micro-app/commit/69032a333b52ee10099c0347be3443e18f4dc4df).
- PR #24, [matriz de aceptación para aislamiento tenant](https://github.com/BTF14/Micro-app/pull/24), está fusionada. Los siete workflows para su head `e7856319321f1aa1047148fd782fcadb77f091c2` terminaron en `success`; los checks del merge commit son un conjunto separado y seguían parcialmente en ejecución en la última consulta.
- `apps/api/src/index.ts` registra health y auth; aún no existen handlers HTTP de negocio para productos, proveedores, ventas, pagos ni movimientos de inventario. La matriz no sustituye pruebas reales de aislamiento.
- Bloqueos vigentes: Google OAuth + allowlist y decisiones D1–D8 no aprobadas; backups/restauración independiente no verificados; protección de `main` desactivada en la última consulta; sin despliegue de producción ni mutaciones en Neon `main`.
- Antes de continuar, verificar de nuevo HEAD, PRs y Actions en vivo. No afirmar preparación de producción por tener CI verde.

## Política vigente de cambios en Neon `main`

Neon `main` ya no se considera permanentemente de solo lectura. La IA puede realizar cambios necesarios de bajo riesgo, compatibles y recuperables si confirma inequívocamente el destino, documenta la necesidad, prueba primero en entorno aislado cuando sea viable, revisa el SQL/migración, comprueba un camino de recuperación y valida después. Cambios destructivos, difíciles de revertir, masivos sobre datos financieros/inventario/usuarios, permisos/credenciales, indisponibilidad material o impacto incierto requieren aprobación explícita previa del usuario. Si el destino, respaldo o impacto no están claros, detenerse. Esta política autoriza cambios prudentes necesarios; no autoriza acciones innecesarias ni riesgos ilimitados. Detalles normativos en [Constitución](CONSTITUTION.md) y `AGENTS.md`.


> **Estado verificado:** `main` apunta a `b85305d11b59b138cd2b6a5e4c796d19ef2cff59`. En ese SHA terminaron en `success` CI, Playwright E2E, Semgrep SAST, panel de progreso, validación de migraciones y Security/Trivy. Enlaces: [CI](https://github.com/BTF14/Micro-app/actions/runs/39107481317), [Playwright](https://github.com/BTF14/Micro-app/actions/runs/39107481327), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39107481311), [panel](https://github.com/BTF14/Micro-app/actions/runs/39107481301), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39107481282), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/39107481281).
>
> PR #9 está fusionada: https://github.com/BTF14/Micro-app/pull/9. Su squash commit es `f1a38f5bc4b101f9d73ae4ca26c2acafb2b208f3`. No usar como estado actual los snapshots históricos de SHA que aparecen en secciones antiguas.
>
> **PR #10 fusionada:** panel de progreso reproducible; todos sus siete workflows terminaron en `success` en el HEAD `be146676cfaef09310c270854bf303079b209b81`. Merge commit: `b85305d11b59b138cd2b6a5e4c796d19ef2cff59`. [PR #10](https://github.com/BTF14/Micro-app/pull/10). Los checks del merge commit deben verificarse por separado.
>
> **Límites:** los tests Playwright actuales usan API simulada; no prueban la integración real API+DB. No se desplegó producción ni se mutó Neon `main`. Los perfiles `.github/agents/` son instrucciones versionadas, no prueba de subagentes activos. GGA/Ollama/Engram/Gentle-AI no están instalados ni conectados desde este chat.

# Protocolo de continuidad para IA/chat — Micro app

**Última actualización:** 2026-10-18  
**Repositorio:** https://github.com/BTF14/Micro-app  
**Rama:** `main`  
**SHA de referencia de `main` al actualizar este handoff:** `b85305d11b59b138cd2b6a5e4c796d19ef2cff59`. Verificar siempre el HEAD vivo antes de actuar.  
**Objetivo:** que una nueva IA retome el trabajo con evidencia, sin repetir solicitudes al usuario, perder decisiones ni inventar estados.

## Lectura obligatoria, en este orden

0. [Constitución del proyecto](CONSTITUTION.md) — reglas no negociables y jerarquía documental.
1. [Este handoff](HANDOFF_NEXT_CHAT.md).
2. [Plan maestro](PROJECT_PLAN.md).
3. [Diario de estado y decisiones](STATE_JOURNAL.md).
4. [Registro de recursos, herramientas y fuentes](RESOURCE_REGISTRY.md).
5. [Evaluación de Gentleman-Programming y adopción](GENTLEMAN_PROGRAMMING_EVALUATION.md).
6. [Modelo operativo de agentes](AGENT_OPERATING_MODEL.md) y perfiles en [`.github/agents/`](../.github/agents/).
7. Documentación de dominio: [API integration](API_INTEGRATION.md), [arquitectura/coste cero](ARCHITECTURE_AND_ZERO_COST.md), [esquema DB](DATABASE_SCHEMA.md), [revisión schema](SCHEMA_REVIEW.md), [inspiración](INSPIRATION.md), [seguridad](SECURITY_PLAN_2026.md), [cumplimiento](COMPLIANCE_REQUIREMENTS.md).

No asumir que un archivo está actualizado solo porque exista. Contrastar la sección de estado vigente con el código, GitHub y Actions.

## Estado histórico y verificación en vivo

- El SHA `d42daeba36d5f8027ab2ea5a417d64a873bc3a20` es histórico, no el HEAD actual de `main`.
- Referencia observada para `main` tras fusionar PR #10: `b85305d11b59b138cd2b6a5e4c796d19ef2cff59`. En PR #10, los siete workflows pasaron en su HEAD `be146676cfaef09310c270854bf303079b209b81`; los checks del merge SHA deben consultarse por separado.
- PR #11 (`docs/refresh-handoff-current-state`) está abierta mientras se actualiza este documento. En el HEAD previo `26808cc778489f7ad0867510e800cd2ac2d68bdd`, seis workflows observados finalizaron en `success`; el estado del PR y los checks del nuevo HEAD deben verificarse antes de integrar.
- PR #4 (autenticación inicial y sesiones revocables), PR #8 (panel), PR #9 (SDD) y PR #10 (reproducibilidad del panel) están fusionadas. Verificar PRs y ramas en vivo antes de rescatar trabajo.
- Rama `feat/neon-transaction-adapter` observada previamente en `7989a84e39536029819735a5202f3934a8eb12c3`; no fusionar a ciegas. Comparar contra `main`, separar cambios únicos y probar con PostgreSQL efímero.
- Las ramas listadas en el historial pueden haber avanzado o sido eliminadas; consultar GitHub antes de basarse en sus SHA.
- El frontend de registro/login se conectó a la API en un commit previo; inspeccionar el código actual antes de modificarlo.

## Bloqueos y tareas prioritarias

### P0 — identidad/autorización incompleta respecto al requisito

La revisión estática de `apps/api/src/auth.ts` encontró `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`; en ese archivo no se encontró Google OAuth, allowlist ni verificación de email. La prueba `apps/api/src/auth.integration.test.ts` no acredita toda la matriz de autorización. Esto es un hallazgo de revisión estática, no una ejecución de prueba adicional.

Próximo paso: estudiar el modelo de identidad y requisitos existentes, proponer una implementación segura de Google + allowlist, documentar opciones y pruebas, sin inventar proveedor/configuración ni enviar correos. No declarar identidad completa hasta que código y tests lo demuestren.

### Integración Neon

Revisar `feat/neon-transaction-adapter` frente a `main`, identificar commits/archivos únicos y cambios ya superados; separar lo rescatable, probar con PostgreSQL efímero y abrir PR solo después de revisión y CI.

### Herramientas y memoria

Leer [GENTLEMAN_PROGRAMMING_EVALUATION.md](GENTLEMAN_PROGRAMMING_EVALUATION.md). Se inspeccionaron los README de Gentle-AI, Engram, GGA, Gentle Shell y Playwright. **No se han instalado ni integrado las herramientas Gentleman**, y no hay evidencia de subagentes autónomos corriendo en segundo plano. Los perfiles locales son instrucciones reutilizables, no ejecución efectiva.

## Restricciones no negociables

- Proyecto independiente de Cantina-pos y de otros repositorios.
- Presupuesto total objetivo **$0**. No habilitar billing, tarjetas, suscripciones ni servicios con cobro automático.
- No ejecutar migraciones ni SQL mutante en Neon `main`; usar PostgreSQL efímero o rama aislada.
- No desplegar producción ni realizar cambios irreversibles sin aceptación del usuario.
- No versionar ni exponer secretos, credenciales, tokens ni URLs de conexión.
- No enviar correos: solo el usuario puede autorizar su envío.
- No pedir que repita permisos/conexiones si no se ha demostrado un bloqueo concreto.
- El usuario autorizó cambios/commits/push seguros de forma autónoma; mantener guardrails para acciones de alto riesgo.
- No declarar tests verdes sin verificar el SHA exacto, el workflow y su conclusión.
- No afirmar que una herramienta/agente/memoria está activa sin evidencia observable.

## Protocolo obligatorio para cada sesión

1. Consultar HEAD actual de `main`, ramas, PR abiertos y Actions relevantes; este handoff es un snapshot, no una fuente viva.
2. Leer el código y documentos directamente afectados. No hacer cambios basados únicamente en resúmenes antiguos.
3. Registrar hipótesis por separado de hechos confirmados. Si falta evidencia, escribir “no verificado”.
4. Elegir un cambio acotado, con criterio de aceptación y plan de reversión.
5. Ejecutar tests relevantes. Registrar comando, resultado, SHA y limitaciones; no inventar ejecución local si solo corrió CI.
6. Revisar seguridad, coste y posibles efectos secundarios.
7. Hacer commit/push si el cambio es seguro y autorizado; nunca force-push ni cambiar producción por comodidad.
8. Actualizar diario, plan y handoff antes de cerrar, incluyendo SHA nuevo y enlaces de Actions.
9. Si se descubre contradicción, resolverla con evidencia y añadir una nota de corrección; no dejar dos instrucciones vigentes en paralelo.

## Prompt copiable para el próximo chat

> Continúa el proyecto Micro app en https://github.com/BTF14/Micro-app. Antes de cambiar código, lee completos `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md` y `docs/GENTLEMAN_PROGRAMMING_EVALUATION.md`; luego verifica en vivo el HEAD de main, ramas, PR y GitHub Actions. No confíes en snapshots viejos sin verificarlos. El requisito P0 es reconciliar autenticación Google + allowlist con el código actual; la rama feat/neon-transaction-adapter requiere diff completo, no merge ciego. Investiga Gentle-AI, Engram, Gentleman Guardian Angel, Gentle Shell y Playwright según la evaluación, pero no digas que están instalados o que hay subagentes corriendo si no hay evidencia. Haz cambios seguros, pruebas reales y push cuando proceda; actualiza documentación y registra SHA/resultados. Mantén el coste $0, no mezcles Cantina-pos, no mutar Neon `main` fuera del gate de `docs/CONSTITUTION.md`, no despliegues producción, no expongas secretos ni envíes correos. No me pidas repetir conexiones/permisos salvo bloqueo demostrado. Distingue hechos, hipótesis y tareas pendientes; no alucines estados.



## Implementación Gentleman-Programming — checkpoint 2026-10-18

- Commit de implementación: `ae0c189487b37d910184b0b5cfa058ddbb6919d4` ([ver en GitHub](https://github.com/BTF14/Micro-app/commit/ae0c189487b37d910184b0b5cfa058ddbb6919d4)).
- Se añadió `.gga` configurado para Ollama local, `docs/GENTLEMAN_IMPLEMENTATION.md` y un enlace desde README.
- Esto es una primera integración versionada, **no** una instalación activa: GGA, Ollama, el modelo, Engram y Gentle-AI no se han ejecutado en este entorno. No se activó un hook local ni se instaló software en el dispositivo del usuario.
- En el momento de registrar el checkpoint, CI, validación de migraciones y escaneo de seguridad estaban `in_progress` para el SHA de implementación. Comprobar sus conclusiones actuales en los enlaces: [CI](https://github.com/BTF14/Micro-app/actions/runs/39103745784), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39103745734), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/39103745953). No reutilizar este estado como si fuera el resultado final.
- Siguiente paso: confirmar Actions del SHA exacto; después, validar instalación y prueba de GGA/Engram en un terminal local o entorno compatible y continuar Gentle-AI. Mantener $0, no activar proveedor de pago, y documentar cada comando/resultado observable.


## Checkpoint nuevo — herramientas de seguridad y E2E (2026-10-18)

Este bloque es más reciente que los snapshots históricos de arriba. PR [#6](https://github.com/BTF14/Micro-app/pull/6) contiene los cambios de la rama `feat/security-e2e-tooling`. Para el SHA `c0bab00aeaee21a4848d6efd5fcf5c5066a5b582`, CI, migración, Security scan, Semgrep y Playwright E2E terminaron en success; verificar el SHA más reciente si hubo commits posteriores:

- `apps/web/playwright.config.ts` + `apps/web/e2e/auth.spec.ts`: dos pruebas de navegador (login exitoso y error de registro) con API simulada.
- `.github/workflows/playwright-e2e.yml`: instala Chromium y ejecuta Playwright; runner `@playwright/test@1.55.0` se instala temporalmente para no editar el lockfile en esta operación. No es aún una dependencia versionada del workspace.
- `.github/workflows/semgrep.yml`: análisis estático JS/TS y reporte SARIF como artefacto; terminó en success para el SHA indicado, pero no bloquea merges.
- `docs/OWASP_ASVS_CHECKLIST.md`: controles P0/P1/P2 que deben seguir sin marcar hasta aportar evidencia.
- `docs/POS_REFERENCE_MATRIX.md`: traduce investigación de OSPOS/NexoPOS/Lakasir/POSNext en criterios de aceptación.

Después de la fusión, verificar los workflows del commit nuevo de main y actualizar este handoff con sus resultados. Próximo paso técnico: fijar Playwright en el workspace y actualizar `pnpm-lock.yaml` mediante pnpm 10 en un entorno ejecutable; luego ampliar E2E y cubrir auth/allowlist real. Google OAuth + allowlist siguen siendo P0. No migrar Neon main ni desplegar producción.


## Prompt de inicio para cualquier IA nueva

> Trabaja exclusivamente en `BTF14/Micro-app`. Antes de tocar código, lee `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/AI_CONTINUITY_PROTOCOL.md` y los documentos de dominio relevantes. Verifica en vivo el SHA de `main`, PRs, ramas y Actions para el SHA exacto. Sigue `docs/SDD_WORKFLOW.md` para cambios significativos y usa `templates/sdd/`. Preserva coste $0; no mezcles Cantina-pos; no expongas secretos; seguir el gate de `docs/CONSTITUTION.md` para Neon `main` y no desplegar producción sin aceptación explícita. Los perfiles `.github/agents/` no prueban que existan subagentes activos. Distingue hechos, inferencias y pendientes. No pidas repetir permisos o contexto ya documentado salvo bloqueo concreto. Al terminar, actualiza plan, diario, handoff y registro de recursos según corresponda, y proporciona enlaces a commits/PR/checks.


## Checkpoint — política de respaldo y recuperación (2026-10-18)

- PR #13 fusionada: https://github.com/BTF14/Micro-app/pull/13; merge SHA `3d8b571f1d6ed3478bf3cf6182c412d3282db586`. Los siete workflows consultados para el HEAD exacto del PR `e03d224f8aded9534db375068f3ae5cac0db8a60` finalizaron en success: CI, Playwright E2E, Semgrep SAST, Security scan, validación de migraciones, validación SDD/documentación y dashboard. Esto valida ese HEAD del PR, no el merge SHA ni producción.
- La regla de Neon `main` se actualizó con gate de cambios necesarios y guardrails. No se ejecutó SQL, no se aplicó migración ni se modificó Neon.
- Nueva política: [BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md). El backup diario es el objetivo de automatización; la revisión de salud y recuperación será cada 15 días. No se ha habilitado aún backup automático.
- Fuente oficial Neon revisada el 2026-10-18: Free ofrece historial PITR de hasta 6 horas (máximo 1 GB) y una snapshot manual; los backups programados no están disponibles en Free. No considerar PITR como sustituto de un backup independiente.
- Bloqueo de backup: aún no se ha verificado un destino independiente, privado, cifrado y gratuito ni una restauración real. No almacenar dumps de producción en Git ni artefactos improvisados. Diseñar, probar en PostgreSQL desechable y confirmar coste/retención antes de activar.
- No desplegar producción ni declarar recuperación lista hasta que una restauración aislada se haya ejecutado y documentado.


## Checkpoint actual — 2026-10-18 (PR #14 y evaluación Drive)

Este bloque es más reciente que los snapshots históricos anteriores; si contradicen este bloque, verificar el estado vivo y aplicar la política vigente de `AGENTS.md` y `docs/CONSTITUTION.md`.

- PR [#14](https://github.com/BTF14/Micro-app/pull/14) está fusionada por squash en `main`, merge SHA `9480f84d8b7d28e830d0fd57212d29a75e44afbb`.
- Se verificaron siete workflows de PR #14 en el HEAD exacto `b421e74631db3c21addd032f2bfbd780b935585d`: CI, Playwright E2E, Semgrep SAST, Security scan, validación de migraciones, validación SDD/documentación y dashboard; todos terminaron en `success`. Esto valida el HEAD del PR, no sustituye la verificación de checks del merge SHA ni prueba backup/restore.
- La política de backups está documentada en [BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md); automatización y restauración siguen **no implementadas/no verificadas**.
- Google Drive se investigó como posible destino $0. Conclusión: candidato viable condicionado, no seleccionado ni configurado. Véase [GOOGLE_DRIVE_BACKUP_EVALUATION.md](GOOGLE_DRIVE_BACKUP_EVALUATION.md). Los 15 GB de una cuenta personal se comparten entre Gmail/Drive/Photos; OAuth persistente, espacio disponible y capacidad de restauración requieren validación. No habilitar facturación.
- No se accedió a la cuenta Google, no se generaron credenciales, no se descargó una base real y no se modificó Neon ni se desplegó producción.
- Próximo paso: crear una prueba automatizada con PostgreSQL desechable y datos sintéticos; validar cifrado, OAuth/upload/download, checksum, restore y alertas antes de activar cualquier copia real. Luego actualizar el handoff con SHA de main y resultados de Actions verificados.


## Continuidad vigente — respaldo pendiente y siguiente prioridad (2026-10-18)

- `main` observado después de integrar evaluación documental: `ed9c5d89f9475a6ab9ec98e991d967319f244ccb`.
- PR [#15](https://github.com/BTF14/Micro-app/pull/15) se fusionó con squash; merge SHA `ed9c5d89f9475a6ab9ec98e991d967319f244ccb`. La evaluación de Google Drive está versionada, pero Drive sigue siendo una opción pendiente, no un destino seleccionado ni configurado. No hay backup automático ni restauración verificada; no se accedió a Google, no se crearon credenciales, no se exportaron datos reales ni se modificó Neon.
- Para el HEAD de PR #15 `adc636732c24f74d3d6457a93af665647a00e097`, los workflows consultados (CI, Security scan, Semgrep, Playwright E2E, validación de migraciones y dashboard) finalizaron en success. Esta evidencia es del HEAD del PR, no demuestra backup/restauración real ni certifica por sí sola el merge SHA.
- Los workflows disparados para el merge SHA aún estaban ejecutándose en la última consulta; reconsultar antes de informar estado final.
- Siguiente prioridad de producto: cerrar revisión del requisito P0 Google Sign-In + allowlist sin inventar decisiones de política. PR [#12](https://github.com/BTF14/Micro-app/pull/12) es solo propuesta SDD y sigue abierto; D1–D8 continúan sin resolver, así que no iniciar implementación OAuth ni inventar allowlist/credenciales. Reconciliar primero estado del PR y la evidencia de CI.
- La rama `feat/neon-transaction-adapter` está divergida de `main`: 14 commits exclusivos y 31 commits detrás según comparación actual. `apps/api/src/database.ts` ya existe en `main` y su contenido coincide con el inspeccionado en la rama; no fusionar esa rama. Revisar únicamente archivos/cambios exclusivos restantes y rescatar de forma selectiva si aportan valor.
- Respaldo: continuar diseñando una prueba sintética/restauración aislada cuando haya entorno ejecutable. No usar datos reales, no almacenar dumps en Git/artefactos y no anunciar el backup como activo hasta probar destino, cifrado, checksum, alerta, retención y restore.
- Guardrails vigentes: presupuesto $0, no mezclar Cantina-pos, no revelar secretos, no desplegar producción, y para Neon `main` aplicar el gate de `docs/CONSTITUTION.md`; detenerse ante impacto/destino/respaldo incierto.


## Checkpoint verificado — PR #16 revisión de autenticación (2026-10-18)

- PR [#16](https://github.com/BTF14/Micro-app/pull/16) fusionada por squash. Merge SHA: `8f3a0316519dd39aded179bb234de316c83bb8ee`.
- El cambio añade `docs/reviews/AUTHENTICATION_AUTHORIZATION_GAP_REVIEW_2026-10-18.md`; es una revisión documental estática, no modifica código de aplicación, secretos, Neon ni producción.
- Para el HEAD exacto del PR `e52033d15c4f37ac862d44a5f06097642a95d75d`, estos seis workflows terminaron en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39110161670), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39110161665), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39110161643), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39110161698), [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39110161635), [dashboard](https://github.com/BTF14/Micro-app/actions/runs/39110161660). Son resultados del HEAD del PR, no una prueba de producción ni de OAuth.
- Hallazgo P0 confirmado por inspección estática: el registro actual permite crear una organización y asignar rol `owner` sin verificar una allowlist; Google OAuth/allowlist no están implementados en `apps/api/src/auth.ts`. Corregir antes de usuarios/datos comerciales reales.
- PR [#12](https://github.com/BTF14/Micro-app/pull/12) ya está fusionada con diseño SDD para Google Sign-In + allowlist (merge SHA `a28bbc686c7b1cb9cbe615ef5bcb9c7ece45ede3`), pero decisiones D1–D8 siguen pendientes. No iniciar OAuth ni inventar reglas, credenciales, dominios o administradores.
- Siguiente: actualizar/reconciliar el estado vivo de main y Actions; resolver D1–D8 mediante evidencia del proyecto y decisiones explícitas necesarias; luego implementar con SDD, pruebas de allowlist, sesiones, roles y aislamiento tenant. Mantener backup externo y restauración como pendientes: no hay backup automático activo ni restore real probado.


## Checkpoint vigente — continuidad verificada 2026-10-18 (PR #16)

- HEAD verificado de `main`: `c092f0a68054dd8cb4c1d1d2d506e8c1bb66b614`. La rama principal ya contiene el merge de PR #16 y las actualizaciones del diario.
- PR [#16](https://github.com/BTF14/Micro-app/pull/16) está fusionada; merge SHA `8f3a0316519dd39aded179bb234de316c83bb8ee`. Su revisión documental es estática, no un pentest ni una ejecución de tests.
- Para el SHA exacto de `main` `c092f0a68054dd8cb4c1d1d2d506e8c1bb66b614`, GitHub Actions confirma al menos CI y Playwright E2E en `success`; verificar también los demás workflows asociados al mismo SHA antes de declarar la matriz completa de checks.
- La revisión AUTH-01 confirma por lectura que `POST /auth/register` crea usuario, organización, membresía `owner` y sesión sin consultar allowlist. No habilitar usuarios ni datos comerciales con ese flujo como si fuese acceso cerrado.
- La PR #12 era un diseño SDD para Google Sign-In + allowlist, no implementación. La búsqueda de PR abiertas en la última consulta no devolvió ninguna; comprobar su estado histórico y recuperar el documento de diseño antes de decidir el siguiente cambio. No asumir que D1–D8 fueron resueltas.
- Próximo trabajo: recuperar las decisiones D1–D8 del diseño, convertirlas en opciones explícitas y detectar cuáles se pueden cerrar usando requisitos ya documentados sin preguntar al usuario; mantener sin implementar OAuth/allowlist hasta que las decisiones de producto imprescindibles estén confirmadas.
- Respaldo: sigue sin existir evidencia de backup externo automatizado ni restauración probada. Mantenerlo como pendiente; coste total objetivo $0, no guardar dumps en Git ni Actions artifacts.
- No se modificó Neon, no se tocaron secretos ni se desplegó producción.


## Continuidad — Strix añadido al plan (2026-10-18)

- Documento: [STRIX_INTEGRATION.md](STRIX_INTEGRATION.md), enlazado también desde el plan maestro, registro de recursos y plan de seguridad.
- Estado: documentación únicamente. Strix no está instalado ni ejecutado; no hay informe de evaluación.
- Próximo paso condicionado: cerrar auth/allowlist P0 y disponer de API + PostgreSQL efímero; luego probar en laboratorio aislado con datos sintéticos y coste $0 comprobado. Nunca usar producción, Neon main o sistemas ajenos.
- Requiere Docker y proveedor LLM; no activar facturación ni integrar ejecución en CI sin revisar coste, permisos y alcance. Mantener informes sin secretos y revisar hallazgos manualmente.
- PR de Strix separada de PR #19; comprobar el estado de ambas en GitHub antes de integrar.


## Checkpoint de continuidad actualizado — 2026-10-18 (PR #19 y #20)

**HEAD vivo de `main` verificado:** `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`. Este SHA es la referencia al momento de esta actualización; volver a consultar GitHub antes de actuar.

### Integraciones documentales recientes
- PR [#20](https://github.com/BTF14/Micro-app/pull/20), `docs: plan controlled Strix security testing`, fusionada. Merge SHA anterior: `c87361685ef1ce36e4cf6025124b09e70ffa0846`.
- PR [#19](https://github.com/BTF14/Micro-app/pull/19), `docs: make authentication policy decisions explicit`, también fusionada. Merge SHA: `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`.
- En el SHA actual de `main` `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`, GitHub Actions devolvió éxito para CI, Playwright E2E, validación de migraciones, Semgrep SAST, Security scan y panel de progreso. Enlaces: [CI](https://github.com/BTF14/Micro-app/actions/runs/39129579632), [E2E](https://github.com/BTF14/Micro-app/actions/runs/39129579599), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39129579656), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39129579602), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/39129579595), [panel](https://github.com/BTF14/Micro-app/actions/runs/39129579631). Esto no es prueba de producción ni de pentest dinámico.

### Strix: intención y límites
- La documentación de Strix existe en [STRIX_INTEGRATION.md](STRIX_INTEGRATION.md), enlazada desde plan, registro de recursos y plan de seguridad.
- El usuario pidió documentar e implementar conocimiento reutilizable para que otra IA/chat sepa **qué es Strix, cuándo conviene usarlo y cómo hacerlo con seguridad**; no pidió ejecutarlo de inmediato.
- Estado real: Strix **no está instalado ni ejecutado**, no se escaneó Micro app, no hay informe, no se conectó un proveedor LLM ni se creó un workflow de Strix en CI.
- Usarlo cuando API + PostgreSQL efímero/datos sintéticos estén disponibles, tras aclarar el bloqueo P0 de autenticación/allowlist. Antes de cualquier escaneo confirmar destino autorizado, aislamiento, Docker, proveedor LLM de coste $0 y redacción de informes. No usar producción, Neon main, datos reales ni sistemas de terceros. No añadir CI activa por defecto.

### Decisiones de autenticación
- PR #19 documenta opciones para decisiones D1–D8 como propuestas, **no política aprobada**. Leer el registro de decisiones en el repo antes de diseñar la implementación.
- Hallazgo estático P0 previamente documentado: `POST /auth/register` permite crear usuario/organización/membresía owner/sesión sin comprobación de allowlist; Google OAuth/allowlist no constaban en `apps/api/src/auth.ts`. Revalidar en código actual antes de tocarlo. No inventar correos admin, dominios permitidos, política de vinculación ni credenciales.

### Otras tareas y límites vigentes
1. Revisar el estado actual de ramas/PRs y comparar `feat/neon-transaction-adapter` selectivamente; nunca hacer merge ciego de una rama divergida.
2. Resolver requisitos de identidad y autorización con las decisiones de producto documentadas; después implementar con SDD y pruebas reales, incluida separación entre tenants.
3. Preparar PostgreSQL efímero para pruebas API+DB; Playwright actual usa API simulada y no demuestra integración real.
4. Diseñar y probar backup/restore con datos sintéticos y destino independiente gratuito; no hay backup automático ni restauración real verificada.
5. No declarar producción lista ni desplegar sin cumplir los gates del proyecto.

### Prompt de arranque para el próximo chat
> Continúa exclusivamente https://github.com/BTF14/Micro-app. El chat anterior alcanzó el límite de duración, por lo que este handoff es el traspaso de contexto. Lee primero `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, el registro de decisiones de autenticación y `docs/STRIX_INTEGRATION.md`. Luego consulta en vivo HEAD de main, PRs, ramas y Actions; el SHA anotado aquí es solo un snapshot. PR #19 y #20 ya estaban fusionadas al actualizar este documento; verifica que siga siendo así. El usuario autorizó avanzar autónomamente con cambios seguros, documentación, pruebas, PR/merge y push cuando sea prudente; no pidas repetir permisos/conexiones sin bloqueo concreto. Mantén coste $0, no mezcles Cantina-pos, no expongas secretos, no envíes correos ni despliegues producción. No ejecutes Strix todavía: está documentado, no instalado ni ejecutado; usarlo más adelante solo en laboratorio autorizado, aislado y con datos sintéticos, tras confirmar proveedor LLM sin coste. No mutar Neon main fuera del gate de la Constitución. Prioriza auth/allowlist P0 y decisiones D1–D8 sin inventar políticas; PostgreSQL efímero y pruebas API+DB son necesarios. Backup/restore sigue sin estar activo/verificado. Distingue hechos de hipótesis, verifica checks contra SHA exacto y actualiza plan, diario, registro y handoff al cerrar trabajo.


## Verificación viva de continuidad — 2026-10-18 (sesión actual)

- Consultado GitHub API en vivo: `main` = `1228a43cb4bc5e1ef8aabb548b034a0af97ec253` (confirmado en `GET /repos/BTF14/Micro-app/branches/main`). La rama no tiene protección activa ni checks requeridos configurados (`protected=false`); registrar como riesgo de gobernanza, no cambiarlo sin evaluación.
- PR [#21](https://github.com/BTF14/Micro-app/pull/21) sigue **open**, `merged=false`, base `main`, head `fb9ab271cc8b1c72e92d7874672913698c59bfe7`. No declarar fusión por el campo `merge_commit_sha` que aparece en el objeto; el estado explícito es open/no merged.
- Para ese HEAD exacto, CI, Playwright E2E, Database migration validation, Semgrep SAST, Security scan y Project progress dashboard terminaron en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39129938686), [E2E](https://github.com/BTF14/Micro-app/actions/runs/39129938460), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39129938520), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39129938702), [Security](https://github.com/BTF14/Micro-app/actions/runs/39129938471), [dashboard](https://github.com/BTF14/Micro-app/actions/runs/39129938467). Los status checks clásicos para ese SHA devolvieron cero; usar los workflows asociados al SHA como evidencia.
- El comentario de Codex informa revisión fallida/hallazgos sin resolver para `fb9ab271...`, pero no hay review formal ni comentarios inline recuperables y el bot indica límite de uso. Esto no prueba un defecto concreto ni permite ignorar el aviso: revisar manualmente el diff y no fusionar hasta aclarar/registrar la limitación. La preview de Cloudflare es solo preview de rama, no producción.
- El listado vivo de PR abiertas devuelve únicamente PR #21. Las ramas consultadas incluyen `main`, `docs/handoff-next-chat-2026-10-18`, `feat/neon-transaction-adapter`, `feat/auth-session-foundation`, `feat/frontend-auth-flow`, `feat/tenant-safe-schema`, `feat/security-e2e-tooling`, `sdd/google-signin-allowlist-design` y ramas documentales; los nombres/heads deben reconsultarse antes de usarlos.
- Revisión actual de `apps/api/src/auth.ts` en main (blob SHA `0735dbad34bd5c932852882da0bff6eebbab337a`): las rutas existentes incluyen registro por contraseña que crea usuario, organización, membresía `owner` y sesión en una transacción; no hay Google OAuth ni allowlist en ese archivo. `apps/api/src/auth.integration.test.ts` sí usa PostgreSQL real/efímero en CI para el flujo contraseña/sesión, pero solo cubre un escenario integrado y no prueba OAuth, allowlist ni aislamiento cross-tenant completo.
- D1–D8 permanecen propuestas no aprobadas en `docs/sdd/auth-policy-decision-record.md`; no se debe inventar email, dominio, bootstrap administrativo, política de organización ni vinculación de cuentas. Por tanto, el cambio OAuth/allowlist completo sigue bloqueado por decisiones de producto; la P0 no está resuelta.
- Strix permanece documentado únicamente; no instalado, ejecutado ni usado para escanear Micro app. No cambiar este estado sin evidencia de instalación/ejecución aislada y coste $0.
- Neon `main`, datos reales, credenciales y producción no se tocaron. No se envió correo ni se habilitó facturación.

## Estado posterior a la fusión — 2026-10-18

- PR [#21](https://github.com/BTF14/Micro-app/pull/21) se fusionó por squash tras autorización del usuario. Merge commit: `7491b97a2bde52555fe9b8a5d808ad81b829d90e`; GitHub confirmó `merged=true` y `state=closed`.
- La fusión solo incluye documentación: handoff, plan, diario y registro de recursos. No desplegó producción ni modificó Neon, secretos o datos reales.
- Los 7 workflows de Actions habían terminado en `success` para el HEAD de la PR `46d5a9a0ec40a699176dc4109943cd7f7bfa4ad1`. El aviso de revisión Codex fue una ejecución fallida sin detalle técnico recuperable; no equivale a aprobación formal.
- La verificación posterior confirmó que `main` avanzó un commit desde `1228a43cb4bc5e1ef8aabb548b034a0af97ec253` mediante la fusión indicada. Consultar GitHub en vivo antes de la siguiente operación.


## Continuidad viva — 2026-10-29 UTC: PR #140/#142 fusionadas

- PR [#140](https://github.com/BTF14/Micro-app/pull/140) fusionada por squash, commit `4fe2b00ed45cf5b779f44b65bcd00133745760e3`.
- PR [#142](https://github.com/BTF14/Micro-app/pull/142) fusionada por squash, commit/HEAD de `main` `c87893313534049463917af5ee17dfd36ba319c4`.
- Checks post-merge en ese SHA: verify/CI, Chromium authentication, migración PostgreSQL, análisis estático, Trivy, escaneo de historial, Semgrep, Playwright E2E, Cloudflare Pages y Workers: todos `success`. No equivale a validar recuperación de datos reales ni a probar endpoints comerciales aún inexistentes.
- La prueba sintética poblada pasó en [run 40849167225](https://github.com/BTF14/Micro-app/actions/runs/40849167225), SHA `caa8d224b0e9c939d033080432caa131b2c8e5bc`: checksum, cifrado/descifrado, 13 tablas, constraints, relaciones y exclusión de tablas efímeras. Siguen pendientes RPO/RTO de extremo a extremo, alerta de fallo y confirmación de coste $0; esto no equivale a restaurar una copia real.
- No abrir PR adicionales para documentar cada micro-paso; integrar test, workflow y continuidad en una sola PR coherente. Si el test falla, inspeccionar logs, corregir la causa en esta misma rama y repetir.


## Handoff vivo — 2026-10-29 UTC, después de PR #143

- Main: `5afe912fc53d7a7027c4ad95bf366ee2abbf6596`. PR [#140](https://github.com/BTF14/Micro-app/pull/140), [#142](https://github.com/BTF14/Micro-app/pull/142) y [#143](https://github.com/BTF14/Micro-app/pull/143) están fusionadas.
- Todos los checks post-merge de #143 en ese SHA terminaron en `success`: CI/verify, Playwright, PostgreSQL migration, análisis estático, Trivy, scan de historial, Cloudflare Pages y Workers.
- El smoke test sintético de recuperación [run 40849605695](https://github.com/BTF14/Micro-app/actions/runs/40849605695) pasó en el SHA de PR `11f4efe24d8ee94f57a068c28867f8cae0aed394`. Incluye PostgreSQL 17 efímero, fixture de venta/pago/inventario/auditoría, age efímero, checksum, restore, manifiesto de 13 tablas/constraints/relaciones y exclusión de tablas efímeras. No usa secretos, Neon ni datos reales.
- Pendientes reales de backup: medir RPO/RTO de extremo a extremo; validar alerta de fallo y el coste $0; la prueba sintética no sustituye restaurar una copia real poblada.
- Monitor diario: [run 40845877052](https://github.com/BTF14/Micro-app/actions/runs/40845877052) pasó en SHA anterior y el audit no encontró vulnerabilidades conocidas. Detectó versiones mayores pendientes (Vite 8, plugin React 6, jsdom 30, TypeScript 7); no actualizarlas a ciegas. Las versiones compatibles Wrangler 4.155.0 y workers-types 5.20261029.1 ya se fusionaron en #142. La rama `fix/dependency-watch-report-20261029` es redundante (0 ahead, 4 behind; workflow idéntico a main); no abrir PR desde ella.
- Próxima prioridad: cuando haya evidencia y compatibilidad suficientes, evaluar el conjunto de upgrades mayores en una rama coherente. Antes, revalidar registry/advisories y compatibilidad con Node 24, Vite, Vitest, React plugin y lockfile; conservar `undici@7.30.1`. No cambiar pnpm major ni introducir pre-releases sin autorización.


## Immediate continuation — fix failed encrypted backup (2026-10-29)

1. PR branch `fix/backup-workflow-path-20261029` contains the minimal workflow fix: use absolute checked-out script path `$GITHUB_WORKSPACE/scripts/prune_backups.py` after changing into the backup clone, and pin runner to `ubuntu-24.04` for a stable, known runner image.
2. Failure evidence: [run 40916692763](https://github.com/BTF14/Micro-app/actions/runs/40916692763). Dump, age encryption and checksum succeeded; a commit was made only in the ephemeral clone. The path error happened before push; no new backup was persisted and retention did not run.
3. Inspect diff and PR checks at exact head SHA. Do not merge if required checks fail or are unverified. Then merge only if repository policy/gates allow it.
4. After merge, manually dispatch the backup workflow once. Verify run conclusion `success`, a new timestamped encrypted file and matching checksum in private repository `BTF14/micro-app-backups/daily/`, and retention output. Never share tokens or the age private key. Existing backups must remain intact if any step fails.
5. Continue pending backup work only after this is verified: failure-alert validation, RPO/RTO measurement, and cost-$0 confirmation. Synthetic restore CI does not prove a fresh production backup was uploaded.


## Immediate continuation — pg_dump PostgreSQL 18 mismatch (2026-10-29)

- Run [40918687069](https://github.com/BTF14/Micro-app/actions/runs/40918687069) failed before dump creation: Neon is PostgreSQL 18.6; command resolved to pg_dump 16.15. Encryption/upload/retention did not run; remote backups were untouched.
- Corrective branch `fix/backup-pg-dump-v18-20261029` installs `postgresql-client-18`, calls `/usr/lib/postgresql/18/bin/pg_dump` explicitly and asserts the major version is 18.
- Inspect exact diff and required PR checks; do not merge with failing or unverified required checks. After merge, dispatch backup workflow and verify dump generation, age encryption, SHA-256, remote file/checksum in private repo, retention output and final success. Never share secrets or private age key.


## Immediate continuation — backup run #7 missing checkout (2026-10-29)

- Run [40920403909](https://github.com/BTF14/Micro-app/actions/runs/40920403909) used pg_dump 18.6 successfully, created the dump, encrypted it and generated SHA-256, then failed because `$GITHUB_WORKSPACE/scripts/prune_backups.py` was absent.
- Root cause: workflow did not use `actions/checkout`; the script exists in repository `main`, but runner workspace was not populated. Fix on branch `fix/backup-checkout-repository-20261029` adds `actions/checkout@v4` before installing/running backup steps.
- Verify diff and required checks; after merge, manually run backup once. Confirm success, remote encrypted file + checksum in private repo, and retention output. Do not share secrets or age private key, and do not delete existing backups during troubleshooting.


## Backup success verified — 2026-10-29

- Run [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) completed `success`. Logs explicitly show `pg_dump 18.6`, successful dump and age encryption, SHA-256 sidecar, remote backup commit `2b038bd` pushed to `BTF14/Micro-app-backups` (GitHub notes canonical repository URL is now `BTF14/Micro-App-backups`), and retention deleted zero files.
- Persisted pair: `daily/backup-2026-10-29T17-29-48Z.dump.age` and `daily/backup-2026-10-29T17-29-48Z.dump.age.sha256`.
- Do not ask user to rerun backup immediately. Next work should be planned: safely verify remote file and checksum, validate backup failure alerting, assess restore procedure using a disposable target and secure age private key without sharing it, then measure RPO/RTO and confirm cost. Do not claim production restore was tested by the synthetic CI test.


## Continuidad prioritaria — main posterior a PR #155 (2026-10-29 UTC)

- Main: `5a9bdc5a18a54c3c68639f52125d913d4e725b91`.
- PR #155 fusionada; la corrección HTTPS de Google OAuth está en main. Ocho workflows del SHA `824e4d02fe4aa56a92c8e6493e65989d4325eaa9` terminaron success (CI, E2E, migraciones, SAST, security, dependency review, secret scan, dashboard). CI incluye build/typecheck, unit y PostgreSQL auth integration tests. Codex review falló por límite de uso; no declarar revisión independiente.
- Cloudflare generó previews de Pages y Workers; no es producción. No despliegue manual.
- PR #154 sigue abierta pero stale/no mergeable. PR #156 reconcilia documentación y plan; no crear otra PR para los mismos cambios.
- Antes de programar productos/inventario/ventas: terminar inventario del esquema, consultas, FKs, índices y rutas; diseñar organización → sucursales → membresías/permisos; decidir catálogo compartido y stock/caja por sucursal; obtener aprobación explícita de la matriz de roles.
- No implementar permisos de negocio a partir de la matriz no aprobada. No añadir branch_id aislado.
- No tocar Neon main, secretos, datos reales ni producción. No activar recursos de pago. Capacidad por tenants aún no medida; comprobar cuotas Neon/Cloudflare y pruebas sintéticas antes de fijar límites.
- Producción continúa NO lista; faltan rutas comerciales, autorización por operación, aislamiento cross-tenant probado, integridad/idempotencia/concurrencia, BCV/fiscalidad y recuperación operativa completa.

---

## Continuidad 2026-10-30 — políticas comerciales configurables por organización

- Leer `docs/sdd/ORGANIZATION_COMMERCIAL_POLICY_CONFIGURATION.md` antes de continuar el diseño de ventas.
- Cada organización decide sus propias políticas comerciales, incluidos descuentos, límites y aprobaciones. Micro app no debe imponer porcentajes ni importes universales.
- La plataforma aporta configuración segura, versionado, aplicación server-side, aislamiento por organización y snapshots/auditoría por operación.
- La matriz `docs/sdd/role-permission-decision-matrix.md` sigue NO APROBADA; no implementar permisos comerciales ni asumir quién puede administrar políticas hasta resolverla.
- La rama `docs/org-policy-architecture-20261030` parte de main `4ab229296d8858c8c553e00a633a762b9c26a81b`. Verificar el HEAD y el estado vivo de la PR antes de actuar.
- Siguiente secuencia: (1) revisar diff y checks de esta PR; (2) consolidar ERD organización→sucursal→almacén/caja/turno con FKs tenant-scoped; (3) resolver la matriz de roles; (4) diseñar integridad/idempotencia/auditoría; (5) solo después preparar una PR de código/migraciones/tests con PostgreSQL efímero.
- No ejecutar migraciones en Neon main ni desplegar producción.


# Reanudación inmediata — 2026-10-30 UTC — branch scope

**Rama:** `feat/branch-scope-context-20261030`  
**Base:** `ce8b0e491fe8b9f6154380cc8b0eea0a19fe8114`.  
**PR:** [#165](https://github.com/BTF14/Micro-app/pull/165), abierta; revalidar estado y HEAD en vivo.

- #164 está fusionada. Cualquier bloque histórico que la describa como abierta queda supersedido por el estado vivo de GitHub y el checkpoint de esta sección.
- Alcance autorizado: owner/admin organización-wide; cashier/inventory solo sucursales con asignación activa. No se aprobaron permisos comerciales sensibles ni excepciones.
- Archivos: `apps/api/migrations/0003_branch_scope.sql`, `0003_branch_scope.assertions.sql`, `apps/api/src/branch-context.ts`, `branch-context.test.ts`, `.github/workflows/migration-check.yml` y `docs/sdd/BRANCH_SCOPE_CONTEXT_IMPLEMENTATION.md`.
- `resolveBranchContext` requiere un TenantContext previamente validado en servidor; verifica sucursal activa dentro del tenant y asignación activa para cashier/inventory. No está conectado a handlers y no autoriza operaciones.
- HEAD de implementación verificado `c3ae1192f0841090ee1b3dea71ed803f1d3c1d8b`: todos los checks (incluidos CI, PostgreSQL branch integration, postgres-migration, Chromium, Semgrep, Trivy, secret-history, dependency review, backup smoke, Pages y Workers preview) success; PR mergeable/clean. Revalidar el SHA actual después de la sincronización documental y comprobar reviews/threads antes de integrar. Codex review falló por cuota agotada; no reintentar. No hay review humana ni threads; usar revisión manual completa como fallback.
- La migración solo se ejecuta en PostgreSQL 18 efímero de CI. No ejecutar en Neon main ni sobre datos reales.
- Próximo trabajo: cerrar decisiones de caja/turnos y matriz de permisos por operación; después diseño de stock por almacén y reconciliación. No crear rutas comerciales hasta cerrar gates.
- Para continuar: leer AGENTS.md, WORK_CHECKPOINT.md, CURRENT_STATE.md, HANDOFF_NEXT_CHAT.md, PROJECT_PLAN.md y STATE_JOURNAL.md; revalidar main/PR/Actions en vivo.

- CI aplica 0003 a PostgreSQL efímero y ejecuta el test de integración del resolver; el workflow separado `postgres-migration` también aplica 0003 y sus assertions SQL. Comprobar ambos en el HEAD final.

- Endurecimiento adicional de la rama: el resolver ahora vuelve a validar organización, usuario y membresía activos y exige que el rol DB coincida con el TenantContext; integración cubre revocación y cambio de rol. La evidencia de checks del HEAD anterior queda supersedida; verificar el HEAD vivo actual.
