# ODD task: Paso 7 — PR 2: Importador CSV de catálogo (v1.1)

## Reconciliación final 7A–7D — 2026-11-20

- **7A — PR #393 MERGED:** `e0801e29e093a17bcc9e4c7116e8081a8d12c41b`. SDD reconciliado, parser CSV seguro y 31 pruebas unitarias.
- **7B — PR #396:** `03d872bdba0c70bb1cf52cba75e5193d662d48c1`. Migración aditiva 0029, assertions y harness CI/backup; Neon `main` reportado por el propietario como migrado a 0029. Esta tarea no accedió ni escribió Neon.
- **7C — PR #397 MERGED:** `f1aeea6d71cfe674ba2c7e879fe3cf0653f6c28a`. Endpoints preview/apply, validación de tenant, hash canónico, transacción e idempotencia.
- **7D — esta PR:** rama `feat/csv-importer-7d-ui-e2e-closure-20261120`, OPEN / Draft. SHA final se registra tras crear el commit; no se inventa SHA de merge futuro.
- **Implementación 7D:** UI de selección/validación UTF-8 y 256 KiB; resumen/detalle por fila; confirmación con clave idempotente estable durante reintentos; manejo de errores 400/409; refresco del catálogo; cobertura jsdom; escenario Playwright real PostgreSQL 18; copy de tienda sin códigos internos.
- **Criterios cumplidos a nivel de implementación:** control de permisos UI; límite y decodificación estricta del archivo; preview/apply y hash esperado; detalle de errores; persistencia de clave en reintento; refresh tras 200; layout móvil y escenario E2E sin mocks. La evidencia de ejecución queda pendiente de GitHub Actions exact-SHA.
- **Criterios de integración pendientes:** todos los check-runs/workflows de la punta exacta deben terminar; revisión humana; merge independiente autorizado y comprobación de main post-merge. Paso 7 no se declara integrado mientras esta PR permanezca Draft.
- **Limitaciones/riesgos residuales:** E2E usa SKU sintético único y PostgreSQL 18 efímero; no es prueba de carga ni demuestra importaciones máximas. La validación cliente complementa, no sustituye, validaciones servidor. La clave se conserva mientras la vista siga abierta y se reintente sin cambiar archivo/delimitador ni generar otra preview; cerrar/recargar inicia otro flujo. Revisión visual/accesibilidad y gates de preproducción siguen separados de CI.


- Status: completed (implementation 7A–7D; exact-SHA CI and merge pending)
- Issue / PR: Micro-PR 7A; PR se abrirá en Draft
- Owner / reviewer: Tech Lead / revisiones backend-data, security y QA
- Started: 2026-11-20
- Risk: high

## Objective and authorization

- Desired outcome: reconciliar el SDD con el esquema posterior a 0028 y entregar un parser CSV puro, determinista y seguro para el futuro importador de catálogo.
- Authorization boundary: rama nueva desde `main` SHA `019997f797c0e7357f05a11d3d8043899f8d5244`; una única PR OPEN / Draft hacia main. Sin merge, auto-merge, deploy, SQL, DB, endpoints, rutas, handlers productivos ni UI.
- Relevant original request: Micro-PR 7A — SDD reconciliado, ODD task y parser puro seguro CSV (Paso 7 / PR 2), 2026-11-20.

## Scope and exclusions

Included:
- Reconciliar `docs/sdd/V11_PR1_CSV_IMPORTER.md` con el catálogo organizacional, `catalog-write.ts`, migración 0028 y gates globales.
- Crear esta tarea ODD con aceptación y evidencia por etapa.
- Crear `apps/api/src/catalog-csv.ts`: decode estricto, parser RFC 4180, selector de delimitador, validación tipada, detección de colisiones, neutralización CSV Formula Injection y SHA-256 canónico.
- Crear `apps/api/src/catalog-csv.test.ts` con Vitest para límites, dialectos, parser, validaciones, reglas 0028 y seguridad.

Excluded:
- SQL/migraciones 0001–0029; tablas o grants; acceso DB/red; endpoints preview/apply; cambios en `catalog-write.ts`, `index.ts`, `apps/web/**`; Neon main, secretos, DNS, Cloudflare, deploy y cambios de gates comerciales.

## Acceptance criteria

- [x] AC-1 — SDD define Paso 7 — PR 2, mantiene gates comerciales y documenta catálogo organizacional, permiso e idempotencia `(organization_id, idempotency_key)`.
- [x] AC-2 — columnas admitidas/prohibidas, defaults, longitudes, NUMERIC y reglas de transición 0028 coinciden con código/migración vigentes.
- [x] AC-3 — parser decodifica UTF-8 estrictamente, aplica límites exactos y cumple RFC 4180; ambigüedad auto falla cerrada.
- [x] AC-4 — normalización, tipos, decimales exactos, quantity_mode, mínimo entero y colisiones SKU/barcode se validan sin DB/red ni Number para cantidades/importes.
- [x] AC-5 — neutralización de fórmulas y quoting CSV son independientes; valores decimales validados conservan exactitud; hash SHA-256 es determinista.
- [ ] AC-6 — implementación y pruebas añadidas; pendiente confirmar CI exact-SHA — suite Vitest cubre los bordes definidos; CI exact-SHA confirma tests/typecheck y workflows aplicables.
- [x] AC-7 — diff contiene exclusivamente los cuatro archivos autorizados; PR queda OPEN / Draft, sin merge/auto-merge.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| CSV formula injection | high | Neutralización de texto y quoting independiente; pruebas para prefijos peligrosos y whitespace |
| Pérdida de precisión | critical | `parseNumeric`/`formatNumeric`, strings/BigInt; prohibido Number para decimales |
| Importación de inventario accidental | critical | Lista fail-closed de columnas prohibidas; sin DB ni endpoints en 7A |
| Escape de tenant | critical | SDD exige permiso organizacional y clave por organización; implementación DB/API diferida a 7B/7C |
| Transición fractional→integer inválida | high | Validación local de mínimo y contrato explícito de revalidación servidor/DB 0028 |
| Parser CSV ambiguo o malformado | high | RFC 4180 estricto, auto fail-closed, límites preparse y casos adversariales |
| Gates de producción alterados | critical | Solo rama/PR Draft; no tocar Neon, secretos, Cloudflare, AC-6, BCV, Issue #53 ni freeze |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Verificar base y contratos | SHA exacto, catálogo API, migración 0028, money package y plantilla ODD leídos | GitHub en ref `019997f797c0e7357f05a11d3d8043899f8d5244` | completed |
| Reconciliar SDD | Especificación 7A–7D coherente | Diff limitado al SDD | in progress |
| Crear parser puro | API de parseo/validación, decimales exactos, hash y neutralización | Revisión de código y CI | pending |
| Crear suite unitaria | Casos de borde completos | Vitest y typecheck en CI exact-SHA | pending |
| Abrir PR Draft | Una PR contra main, base SHA correcto, cuatro archivos | Metadatos PR y diff GitHub | pending |
| Validar CI | Todos los check-runs/workflows reales del SHA final terminados | GitHub Actions exact-SHA | pending |

## Technical decisions

- `products` es organización-scoped; la sucursal no forma parte de la autorización del catálogo ni de la clave idempotente.
- El parser no puede saber si un SKU existe; por tanto, exige `sku` siempre y deja la obligatoriedad condicional de `name`/`price_usd` para preview/apply server-side en 7C.
- El parser puede validar el mínimo entero declarado, pero no puede observar balances/conteos; 0028 y la API deben volver a validar fractional→integer durante apply.
- `@micro-app/money` exporta `parseNumeric` y `formatNumeric`; el parser conserva strings/BigInt y no usa Number para importes/cantidades.
- No se cambia el script de test ni configuración: Vitest descubre automáticamente `*.test.ts` bajo el alcance existente.

## Closure and handoff

- Final commit SHA: pendiente.
- PR: pendiente; debe quedar OPEN / Draft.
- Checks and exact outcomes: pendientes de CI real sobre el SHA final; no se afirma ejecución local.
- Acceptance criteria met / unmet: pendiente de implementación y CI.
- Limitations not verified: no se ejecutan pruebas locales en este flujo de integración GitHub.
- Residual risks: 7A no valida contra catálogo/DB ni ejecuta preview/apply; quedan diferidos a 7B/7C/7D.
- Next step: completar revisión del parser y sus tests; esperar CI exact-SHA; mantener intactos los gates globales.
