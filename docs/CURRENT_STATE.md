# Checkpoint autoritativo — revisión e instalación curada de skills (2026-10-19)

- Rama de trabajo: `chore/curated-agent-skills-audit`; los cambios aún no están fusionados en `main`.
- AutoSkills 0.4.1 se ejecutó con éxito en GitHub Actions en modo `--dry-run` (run [39300536264](https://github.com/BTF14/Micro-app/actions/runs/39300536264), SHA probado `09f17020f7543439ed822726419de9777d34fa08`; propuso 19 skills, pero el CLI no instaló ninguna.
- Revisión individual de las 19 propuestas: [`docs/AUTOSKILLS_REVIEW_2026-10-19.md`](AUTOSKILLS_REVIEW_2026-10-19.md). Registro JSON con decisiones, procedencia y hashes: [`skill-install-log.json`](../skill-install-log.json).
- Dos skills externas MIT instaladas en esta rama: `external-accessibility` y `external-typescript-advanced-types`, con referencias completas, LICENSE upstream y overlays de seguridad/compatibilidad. Sin dependencias nuevas, scripts de terceros, secretos, base de datos ni despliegues.
- `skill-install-log.json` es el log propio del proyecto; no se creó un `skills-lock.json` oficial falso. El paquete AutoSkills declara CC-BY-NC-4.0 y el manifest oficial no fue legible por el conector, por lo que sus `bundleHash/securityCheck` no se declaran verificados.
- PR [#68](https://github.com/BTF14/Micro-app/pull/68) está abierta, no fusionada; HEAD actual de código `b2e66b388097293bdc8a82f0073e70066c2b8f3e`.
- Última validación de integridad exitosa: [run 39305555253](https://github.com/BTF14/Micro-app/actions/runs/39305555253) sobre commit `86304ffd4d45fbd9902d0344228b9e9f96b9cf1c`, verificó el JSON y los 7 archivos instalados. Después se cambió solo metadata del log y se añadió una aserción de formato de hashes de fuente al validador; las skills no cambiaron.
- Las ejecuciones posteriores de `Agent skill integrity` (runs [39305676786](https://github.com/BTF14/Micro-app/actions/runs/39305676786) y [39305905625](https://github.com/BTF14/Micro-app/actions/runs/39305905625)) terminaron antes de asignar runner: `runner_id=0`, cero pasos, sin logs. Por eso la versión más reciente del validador todavía no está revalidada; no interpretar estos fallos de arranque como fallo de los asserts. No fusionar hasta obtener una ejecución nueva con runner y resultado success.
- Límites de producto sin cambios: P0 Google OAuth/allowlist y decisiones D1–D8 siguen pendientes; la app no está lista para producción. Presupuesto $0; no tocar producción ni Neon `main`.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #64

- Repositorio canónico: https://github.com/BTF14/Micro-app.
- `main` incluye PR #64 por squash: `f15e3b0da415b8f31641a81ed8a883deb7fcfc5f`. PR #63 merge SHA: `b4b417ec5a85b8b0c48b606c718c341745af9055`; PR #62 merge SHA: `d107cfb2b80c4165ed39e3071f8256942898ffb7`; PR #61 merge SHA: `1b8098ff00e0bb7482200b486710a5611f1e109d`.
- PR #63 fusionada; sus siete workflows terminaron en success sobre el head exacto `6baffe8fb473128504361c28fd6ac0c0e01519d9`. PR #64 fusionada; seis workflows consultados terminaron en success sobre el head exacto `97088a2d0d599001f145f4e60f72556a66a5f8b4`: CI, Playwright E2E, Security scan, Semgrep SAST, database migration validation y project progress dashboard. No se ejecutaron tests locales; los workflows no certifican readiness de producción.
- PR #60 está cerrada como supersedida, no fusionada. La comparación confirmó que la política de autonomía/revisión manual quedó integrada por PR #62/#63; no se reintrodujo el handoff histórico obsoleto. No hubo force-push.
- PR #64 añadió cuatro skills de proyecto bajo `.agents/skills/`: `micro-app-auth-security`, `micro-app-postgres-testing`, `micro-app-stack-guidance` y `micro-app-skill-curation`, además de `docs/AUTOSKILLS_ADOPTION.md`. Son instrucciones locales creadas para Micro app, no bundles externos descargados.
- AutoSkills CLI 0.4.1 sí se ejecutó en GitHub Actions y el dry-run fue success (run 39300536264); no instaló skills. La revisión curada posterior está registrada en `docs/AUTOSKILLS_REVIEW_2026-10-19.md` y `skill-install-log.json`. La instalación externa de dos skills MIT está en una rama de revisión, no en `main`; no hay `skills-lock.json` oficial.
- P0 de identidad sigue pendiente: Google sign-in + allowlist no está implementado; D1–D8 y matriz de permisos por rol siguen sin aprobación. `POST /auth/register` permanece fail-closed. La ruta de login por contraseña sigue existiendo; no afirmar que una allowlist la protege.
- No inventar emails/dominios, configuración OAuth, bootstrap admin ni vinculación de cuentas. No tocar producción, Neon `main`, datos reales, secretos, emails, billing ni Cantina-pos. Presupuesto $0.
- La aplicación NO está lista para producción. Backups/restauración independiente, handlers comerciales, aislamiento tenant completo, permisos aprobados, E2E reales y controles de concurrencia/idempotencia siguen pendientes. Strix sigue documentado, no instalado/ejecutado.
- PR #64 generó una vista previa de rama por la integración automática de Cloudflare; no fue despliegue productivo ni se activó manualmente.

## Próximos pasos
1. En un entorno con red, ejecutar `npx autoskills --dry-run`; seleccionar únicamente skills compatibles con React/Vite, Hono/Workers, TypeScript, Neon y pruebas, verificando licencia y hash. Registrar la salida real.
2. Continuar revisión estática y pruebas aisladas de auth/sesión/autorización. No implementar decisiones D1–D8 ni permisos hasta su aprobación.
3. Comparar `feat/neon-transaction-adapter` contra el `main` vivo sin merge ciego.
4. Mantener handoff, plan y diario actualizados con SHA/checks exactos; no desplegar producción ni mutar Neon `main`.

--- Checkpoint autoritativo — 2026-10-19, después de PR #57

- Repositorio: https://github.com/BTF14/Micro-app
- `main`: `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe` — https://github.com/BTF14/Micro-app/commit/cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe.
- PR #55 y #56 fusionadas para continuidad documental; PR #57 fusionada: https://github.com/BTF14/Micro-app/pull/57.
- PR #57 bloquea `POST /auth/register`: después de validar Origin devuelve `503 REGISTRATION_DISABLED` antes de parsear credenciales o acceder a la DB. No crea usuarios, organizaciones, membresías, sesiones ni rate-limit rows, y no emite cookie en el camino bloqueado.
- Checks de PR #57 en el head exacto `71d3e6d3ffe625b12807e9942ddd261e222cf093`: verify, PostgreSQL auth integration, Chromium smoke, JS/TS static analysis, Trivy, migration validation, generate-progress y Cloudflare Pages terminaron en success. Los checks consultados en el merge SHA también terminaron en success. No se ejecutaron pruebas locales.
- Cloudflare reportó un Preview URL para el SHA fusionado: https://1d3d60bf.micro-app-63i.pages.dev. No hay evidencia en ese check de un despliegue productivo.
- Issue P0 #53 permanece abierto: el registro está bloqueado temporalmente, pero Google sign-in + allowlist no está implementado y D1–D8 siguen sin aprobarse. No cerrar el issue hasta implementar y probar el flujo aprobado.
- La rama `feat/neon-transaction-adapter` se comparó otra vez con `main`: divergida, 14 commits propios y 76 commits detrás, merge-base `2d2099245f2404b0a8d3689189235a577d5e632c`. El adaptador `database.ts` y workflow de seguridad son idénticos a main; la prueba de DB en la rama es más antigua, `apps/api/package.json` usa un script de test incompatible con la separación de integración actual, y sus documentos están desactualizados. **No fusionar la rama completa**.
- Matriz de roles/permisos sigue sin aprobación; no crear rutas comerciales autorizadas según supuestos.
- App **NO lista para producción**: falta Google OAuth/allowlist, permisos aprobados, handlers de POS/inventario/ventas, aislamiento tenant real, E2E real, idempotencia/concurrencia, validación fiscal y backup/restauración independiente.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado, no instalado ni ejecutado. Coste objetivo $0. Sin secretos, emails, billing, datos reales, mutaciones de Neon `main` ni mezcla con Cantina-pos.

## Próximos pasos
1. Pedir al propietario la aprobación explícita de la política de identidad D1–D8 y matriz de roles; usar las recomendaciones documentadas como propuesta, no como decisiones ya aprobadas.
2. Mantener el registro fail-closed hasta que la política de identidad se implemente y pruebe.
3. Continuar con pruebas de auth/sesión y preparación de la primera ruta comercial solo después de aprobar los permisos.
4. Mantener cambios pequeños, PRs y verificación por SHA exacto.
5. No fusionar `feat/neon-transaction-adapter` completa; rescatar solo un cambio concreto si aparece una necesidad comprobada.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #55

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado después del merge: `b7117f8aeb868e25c49db86a524405511cd3c9be` — https://github.com/BTF14/Micro-app/commit/b7117f8aeb868e25c49db86a524405511cd3c9be.
- PR #55 fusionada: https://github.com/BTF14/Micro-app/pull/55. Solo añade el checkpoint de continuidad tras PR #54.
- Los 8 check-runs consultados para el head exacto de PR #55 `a4e51ec10bcbc0ac786bb3e518d50de9ec7eee28` terminaron en `success`: Cloudflare Pages (preview de rama, no producción), Trivy filesystem/config (dos ejecuciones), análisis estático JS/TS, verify, postgres-migration, Chromium authentication smoke tests y generate-progress. No se ejecutaron pruebas localmente ni se verificaron estos checks independientemente sobre el merge SHA.
- No hay PR abiertas en el momento de esta consulta.
- Issue P0 #53 continúa abierto: https://github.com/BTF14/Micro-app/issues/53. El registro público de `apps/api/src/auth.ts` sigue sin una política de identidad Google + allowlist demostrada. No afirmar que el alta pública esté bloqueada.
- D1–D8 de identidad y la matriz de permisos por rol siguen sin aprobación. No inventar proveedor OAuth, allowlist, bootstrap administrativo, verificación de correo, linking/recuperación ni permisos.
- La app NO está lista para producción: faltan handlers comerciales completos, pruebas reales API+PostgreSQL y aislamiento tenant aplicado/verificado, idempotencia/concurrencia, revisión fiscal y backup/restauración independiente.
- Preview de la rama #55: https://docs-checkpoint-after-pr54.micro-app-63i.pages.dev. Es un preview documental, no una aprobación de lanzamiento ni despliegue productivo.
- Strix (`https://github.com/usestrix/strix.git`) continúa documentado solamente: no instalado ni ejecutado. Coste objetivo $0. Sin secretos, emails, billing, datos reales, mutaciones de Neon `main`, producción ni mezcla con Cantina-pos.

## Siguiente paso
1. Solicitar al usuario aprobación explícita de las decisiones de identidad/roles que solo él puede fijar; facilitar opciones breves en el chat.
2. Mientras tanto, continuar revisión estática de seguridad y pruebas de bajo riesgo que no dependan de decisiones pendientes.
3. Mantener PRs pequeñas, revisar diff completo y comprobar checks del SHA exacto antes de fusionar.
4. Actualizar este documento, el handoff, plan y diario al siguiente hito.
5. No fusionar `feat/neon-transaction-adapter` a ciegas; sigue requiriendo comparación con main actual.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #51

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `e18a3ec267f4c4d0e02678a4c0522dabf200ac98` — https://github.com/BTF14/Micro-app/commit/e18a3ec267f4c4d0e02678a4c0522dabf200ac98
- PR #51 fusionada: https://github.com/BTF14/Micro-app/pull/51. Añade pruebas de error de base de datos para login y registro; las respuestas son seguras y no emiten cookie. Head probado `92ea991d6333bcd1b05943f679fdd36777ab6a8f`; seis workflows success: CI 39255462405, Playwright E2E 39255462498, migraciones 39255462284, Security scan 39255462264, Semgrep SAST 39255462627 y dashboard 39255462281.
- PR #50 fusionada: https://github.com/BTF14/Micro-app/pull/50. Login sin membresía activa o con organización inactiva no emite cookie. Head probado `dcad8d6d1caf6db3aabbc95465e5983ad0014746`; seis workflows success: CI 39255158169, Playwright E2E 39255157709, migraciones 39255158077, Security scan 39255157712, Semgrep SAST 39255157509 y dashboard 39255157611.
- PR #47–#48 añadieron cobertura para fallos de validación de sesión y usuarios inactivos; PR #49 actualizó documentación previa.
- No se ejecutaron pruebas localmente. Los workflows citados corresponden al head exacto de cada PR; no se verificaron aquí sobre los merge SHA.
- Próximo foco: autorización server-side y aislamiento tenant. Inspeccionar handlers reales; no inventar endpoints comerciales. D1–D8 de Google OAuth/allowlist y matriz de permisos siguen pendientes de aprobación.
- Bloqueos P0: OAuth/allowlist/verificación de correo no demostrados como implementados; faltan flujos comerciales completos, E2E contra API+PostgreSQL reales, aislamiento multiempresa completo y backup/restauración independiente probados.
- No desplegar producción ni modificar Neon `main` sin superar los gates de `docs/CONSTITUTION.md`. Sin secretos, correos, billing, datos reales ni mezcla con Cantina-pos. Strix documentado, no instalado ni ejecutado. Coste objetivo $0.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #48

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `420a64152103c90d2990d47c72fc19a744786fa6` — https://github.com/BTF14/Micro-app/commit/420a64152103c90d2990d47c72fc19a744786fa6
- PR #48 fusionada: https://github.com/BTF14/Micro-app/pull/48. Prueba que el login de una cuenta inactiva devuelve 401 sin crear cookie de sesión. Head probado: `6acb78018a47eb39f74dab079b53b51b4cacf11f`; los seis workflows terminaron en success: CI 39254257051, Playwright E2E 39254256939, migraciones 39254257076, Security scan 39254256854, Semgrep SAST 39254256882 y dashboard 39254256826.
- PR #47 fusionada: https://github.com/BTF14/Micro-app/pull/47. Prueba que `/auth/me` devuelve un error seguro y no limpia la cookie cuando la base de datos no permite validar la sesión. Head probado: `7939d11678cfd1a2bb8fac22664096663603c824`; seis workflows en success: CI 39253558854, Playwright E2E 39253558793, migraciones 39253558714, Security scan 39253558727, Semgrep SAST 39253558761 y dashboard 39253558724.
- PR #46 actualizó los documentos de continuidad después de PR #45.
- No se ejecutaron pruebas localmente. Los workflows citados corresponden al head exacto de cada PR; no se verificaron aquí sobre los merge SHA.
- Próximo foco: autorización server-side y aislamiento tenant. Primero revisar handlers reales; no inventar endpoints comerciales. D1–D8 de Google OAuth/allowlist y matriz de permisos siguen pendientes de aprobación.
- Bloqueos P0: OAuth/allowlist/verificación de correo no demostrados como implementados; faltan flujos comerciales completos, E2E contra API+PostgreSQL reales, aislamiento multiempresa completo y backup/restauración independiente probados.
- No desplegar producción ni modificar Neon `main` sin superar los gates de `docs/CONSTITUTION.md`. Sin secretos, correos, billing, datos reales ni mezcla con Cantina-pos. Strix documentado, no instalado ni ejecutado. Coste objetivo $0.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #45

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `1c6ecf6a4586ab1252a43210672e123975f8941f` — https://github.com/BTF14/Micro-app/commit/1c6ecf6a4586ab1252a43210672e123975f8941f
- PR #45 fusionada: https://github.com/BTF14/Micro-app/pull/45. Añade una aserción en `apps/api/src/auth.integration.test.ts` para verificar que `/auth/me` elimina la cookie si la cuenta está inactiva.
- Head exacto de PR #45: `cdce44a9643c5134311f9603abf1248c07970df3`. Seis workflows de GitHub Actions terminaron en `success`: CI 39252317370, Playwright E2E 39252317397, migraciones 39252317371, Security scan 39252317467, Semgrep SAST 39252317386 y dashboard 39252317373.
- PR #44 cubre sesión revocada y organización inactiva; PR #43 cubre sesión expirada. No se ejecutaron pruebas localmente ni se verificaron aquí los workflows sobre el merge SHA.
- Prioridad siguiente: revisar autorización server-side y aislamiento tenant antes de añadir handlers comerciales. D1–D8 de Google OAuth/allowlist y la matriz de permisos siguen pendientes; no elegir políticas por suposición.
- Bloqueos P0: OAuth/allowlist/verificación de correo no demostrados como implementados; faltan flujos comerciales completos, E2E con API+PostgreSQL reales, aislamiento multiempresa completo y backup/restauración independiente probados.
- No desplegar producción ni modificar Neon `main` sin superar los gates de `docs/CONSTITUTION.md`. Sin secretos, correos, billing, datos reales ni mezcla con Cantina-pos. Strix está documentado, no instalado/ejecutado. Objetivo $0.

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


# Estado vigente verificado — Micro app

**Checkpoint actualizado:** 2026-10-18.  
**HEAD de `main` verificado:** `69032a333b52ee10099c0347be3443e18f4dc4df` — [commit](https://github.com/BTF14/Micro-app/commit/69032a333b52ee10099c0347be3443e18f4dc4df).  
**PR #24 fusionada:** [matriz de aceptación para aislamiento tenant](https://github.com/BTF14/Micro-app/pull/24). Su head `e7856319321f1aa1047148fd782fcadb77f091c2` tuvo los siete workflows asociados en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39132363061), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39132363092), [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39132363114), [validación de migraciones](https://github.com/BTF14/Micro-app/actions/runs/39132363103), [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39132363026) y los dos escaneos de seguridad ([1](https://github.com/BTF14/Micro-app/actions/runs/39132362959), [2](https://github.com/BTF14/Micro-app/actions/runs/39132359995)).  
**Checks del merge commit:** seis workflows detectados; el panel de progreso ya pasó y CI, Playwright, seguridad, Semgrep y validación de migraciones seguían en ejecución en la última consulta. Verificar su estado para este SHA antes de concluir que el merge commit está verde.

**Hallazgo de autorización:** `apps/api/src/index.ts` registra health y rutas de autenticación. No hay handlers HTTP de negocio para productos, proveedores, ventas, pagos ni movimientos de inventario. La matriz de `docs/TENANT_ISOLATION_TEST_PLAN.md` define aceptación futura; no demuestra aislamiento funcional en endpoints que aún no existen.

**Bloqueos:** Google OAuth + allowlist y decisiones D1–D8 siguen sin aprobación; backups/restauración independiente no verificados; protección de rama `main` desactivada en la última lectura; no desplegar producción ni modificar Neon `main` sin superar los gates de la Constitución. Los workflows verdes de documentación no certifican preparación para producción.

---


**Verificado:** 2026-10-18 (consulta directa a GitHub API y archivos de `main`).  
**Repositorio:** https://github.com/BTF14/Micro-app  
**Propósito:** referencia breve de estado vivo. Este archivo prevalece sobre snapshots históricos de `PROJECT_PLAN.md`, `STATE_JOURNAL.md` y `HANDOFF_NEXT_CHAT.md` cuando sus SHA/estados contradigan los datos aquí. Antes de cada cambio, repetir la consulta en vivo.

## Estado Git y CI

- `main`: `1e48eb9b2056a0d472f69a7cd62c1b3930d27c13` — [commit](https://github.com/BTF14/Micro-app/commit/1e48eb9b2056a0d472f69a7cd62c1b3930d27c13).
- PR abiertas: ninguna en la consulta de GitHub.
- Para ese SHA exacto, los seis workflows más recientes consultados terminaron en `success`:
  - [CI](https://github.com/BTF14/Micro-app/actions/runs/39131400317)
  - [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39131400310)
  - [Validación de migraciones](https://github.com/BTF14/Micro-app/actions/runs/39131400321)
  - [Panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39131400327)
  - [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39131400368)
  - [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39131400390)
- La rama `main` no tiene protección activa ni checks obligatorios configurados (`protected=false`). Es un riesgo de gobernanza pendiente; no se ha cambiado la configuración.
- Estos workflows verdes no demuestran que el producto esté listo para producción.

## Bloqueos y siguientes prioridades

1. **P0 identidad:** revisión estática de `apps/api/src/auth.ts` en el `main` indicado encontró solo `POST /auth/register`, `POST /auth/login`, `GET /auth/me` y `POST /auth/logout`; no encontró Google OAuth, allowlist ni verificación de email. Las decisiones D1–D8 en `docs/sdd/auth-policy-decision-record.md` continúan expresamente sin aprobar. No inventar correos/dominios, bootstrap de administrador, política de organizaciones ni vinculación de cuentas. No activar OAuth ni enviar correos sin resolver las decisiones y configurar los secretos de forma segura.
2. **Adaptador Neon:** `feat/neon-transaction-adapter` (`7989a84e39536029819735a5202f3934a8eb12c3`) está divergida respecto a este `main`: 14 commits por delante, 43 por detrás; el merge-base es `2d2099245f2404b0a8d3689189235a577d5e632c`. El diff resumido enumera siete archivos: workflow de seguridad, paquete API, pruebas y adaptador de base de datos, integración API y dos documentos de seguridad/cumplimiento. No fusionar a ciegas; hacer revisión archivo por archivo y rescatar cambios por separado.
3. Ampliar pruebas de identidad, sesiones, autorización y aislamiento entre tenants con PostgreSQL efímero; no confundir E2E con API simulada con integración real.
4. Verificar automatización de backups y restauración real independiente; no se ha demostrado que estén operativas.
5. Seguir el checklist `docs/PRODUCTION_READINESS.md`; la app aún no está lista para despliegue comercial.

## Límites operativos

- Mantener coste objetivo $0 y separación absoluta de Cantina-pos.
- No exponer secretos ni enviar correos.
- No hacer despliegue de producción sin aprobación explícita.
- Para Neon `main`, seguir el gate de cambio de producción de `docs/CONSTITUTION.md`; probar primero en entorno aislado y no ejecutar cambios destructivos/ambiguos sin aprobación.
- Strix está documentado, pero no instalado ni ejecutado; solo evaluar en laboratorio aislado con datos sintéticos y coste confirmado $0.
- No declarar pruebas locales, instalaciones, agentes o ejecuciones autónomas como hechos si no existe evidencia.

## Protocolo de actualización

Después de cada cambio significativo, actualizar este archivo y el diario/handoff pertinentes; registrar el SHA y enlaces de Actions para ese SHA exacto. Si `main` avanza, actualizar primero este checkpoint en lugar de copiar estados antiguos.


## Revisión preliminar de `feat/neon-transaction-adapter` (2026-10-18)

Se compararon los siete archivos enumerados por GitHub al contrastar la rama con el `main` actual. Hallazgos verificables:

- `.github/workflows/security-scan.yml`, `apps/api/src/database.ts` y `apps/api/src/database.test.ts` tienen el mismo blob SHA en la rama y en `main`; no aportan diferencias actuales.
- `apps/api/package.json` difiere: la rama usa `vitest run`, mientras que `main` excluye los archivos `*.integration.test.ts` del comando unitario. No restaurar el script antiguo sin revisar cómo CI ejecuta las pruebas de integración.
- `docs/API_INTEGRATION.md`, `docs/COMPLIANCE_REQUIREMENTS.md` y `docs/SECURITY_PLAN_2026.md` están desactualizados respecto a sus versiones de `main` y podrían reintroducir afirmaciones ya corregidas.
- Con esta comparación no aparece una implementación de adaptador o pruebas unitarias que falte rescatar de esa rama: los archivos centrales del adaptador ya coinciden con `main`. La rama no debe fusionarse; si se necesita rescatar algo, hacerlo como cambios puntuales después de revisión, no mediante merge.

Esta revisión fue estática de contenidos en GitHub; no se ejecutaron tests desde un entorno local ni se cambió la rama del adaptador.
