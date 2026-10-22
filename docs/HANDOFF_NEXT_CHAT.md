## Handoff vigente — diagnóstico de Actions y auditoría de publicación (2026-10-21)

## Checkpoint de seguridad y Actions — 2026-10-21

- PR #74 sigue abierta, draft, sin fusionar: https://github.com/BTF14/Micro-app/pull/74. Head revisado antes de este checkpoint: `2849a96599022e3ea330aacea68a713fdc76a626`. Revalidar SHA después de estos cambios documentales.
- Se identificaron los siete workflows fallidos sobre ese head: [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39701045262), [CI](https://github.com/BTF14/Micro-app/actions/runs/39701045291), [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39701045311), [Project progress dashboard](https://github.com/BTF14/Micro-app/actions/runs/39701045339), [Secret history scan](https://github.com/BTF14/Micro-app/actions/runs/39701045297), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39701045409) y [Database migration validation](https://github.com/BTF14/Micro-app/actions/runs/39701045414).
- Los siete jobs de esos runs terminaron con `runner_id: 0`, cero steps y logs no disponibles (404 `BlobNotFound`). Duración aproximada: 2–3 segundos. Esto indica que no hay evidencia de que los comandos de CI hayan comenzado; no atribuir los fallos al código y no marcar ningún test ni escaneo como aprobado.
- Se reintentó solamente el job de Secret history scan (run 39701045297) como prueba diagnóstica. En la última consulta, el intento 2 estaba `queued`, con job ID `119573359675` y sin runner asignado todavía. Revisar su conclusión y steps antes de cualquier afirmación.
- El endpoint de combined status para el head solo mostró los dos contextos Vercel en éxito; no sustituye a los siete workflows. No se obtuvo la causa de infraestructura/billing/runner, y no se debe asumir que sea cuota agotada sin un mensaje de GitHub que lo confirme.
- Se releyó `.github/workflows/ci.yml`: el workflow usa `ubuntu-latest`, PostgreSQL 18 efímero y ejecuta install/build/typecheck/unit/integration tests, pero esos pasos no aparecen en los runs fallidos. El workflow de seguridad Trivy también es no bloqueante por diseño (`exit-code: '0'`), de modo que su conclusión por sí sola no certifica ausencia de hallazgos.
- Auditoría de publicación: 78 ramas inventariadas; todas se reportaron sin protección. La comprobación de nombres de archivos en árboles actuales solo encontró `apps/web/.env.example` entre los patrones buscados, con URL localhost de ejemplo; esto no reemplaza el escaneo completo de historia. No hay resultado Gitleaks válido todavía.
- Límites: repo privado; no cambiar visibilidad, no fusionar PR #74, no desplegar producción, no tocar Neon `main`, no exponer secretos ni incurrir en costes. El siguiente paso es comprobar el intento 2 de Gitleaks; si sigue sin runner, documentar la evidencia y resolver el bloqueo desde la configuración/uso de GitHub Actions, no mediante cambios de código especulativos.

### Próxima secuencia
1. Consultar en vivo PR #74 y SHA actual de `security/pre-publication-audit`; los commits documentales cambian el head.
2. Comprobar run 39701045297, intento 2: confirmar si fue asignado un runner y si Gitleaks ejecutó steps. Si sí, revisar hallazgos sin divulgar valores de secretos; si no, capturar el estado exacto y no seguir reintentando en bucle.
3. Si Actions continúa sin runner, buscar evidencia específica en los ajustes/estado de Actions y límites de uso del propietario. No afirmar causa por inferencia. No hacer público el repositorio como workaround sin confirmación explícita.
4. Mantener PR #74 draft y privada hasta que el escaneo real de historia concluya y sus resultados se revisen. Habilitar protección de rama/secret protections desde Settings cuando la interfaz/permiso lo permita.
5. No fusionar ni desplegar producción; no modificar Neon `main`, credenciales, datos reales ni facturación.

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
