# Registro de herramientas, repositorios y fuentes de Micro app

Actualizado: 2026-10-30. Este registro no sustituye la verificación en vivo: planes gratuitos, documentación y estado de repositorios cambian. Añadir cada fuente consultada con fecha, uso, conclusión y limitaciones. No registrar secretos ni URLs que contengan credenciales.

## Herramientas y servicios del proyecto

| Herramienta/servicio | Uso previsto | Documentación oficial | Control/precaución |
|---|---|---|---|
| GitHub repository/actions | Código, PR, revisión, CI, escaneo y continuidad persistente. | https://docs.github.com/en/actions · https://docs.github.com/en/rest | Verificar SHA y workflow; no asumir que queued significa success. |
| pnpm 10 / workspace | Gestor de paquetes para `apps/*`. | https://pnpm.io/ | `pnpm-lock.yaml` está versionado; CI debe usar instalación congelada. |
| React + Vite + TypeScript | Frontend web responsive. | https://react.dev/ · https://vite.dev/ · https://www.typescriptlang.org/docs/ | Validar formularios y errores; la UI nunca es frontera de autorización. |
| Cloudflare Pages | Hosting estático objetivo para frontend. | https://pages.cloudflare.com/ | Reconfirmar límites/condiciones y no desplegar producción sin aceptación. |
| Cloudflare Workers + Hono | API separada con estándares web. | https://developers.cloudflare.com/workers/ · https://hono.dev/ | No asumir compatibilidad de middleware diseñado para Express. |
| Neon PostgreSQL | Base de datos dedicada `micro-app-db`, plan Free según estado previo documentado. | https://neon.com/docs · https://neon.com/pricing | `main` es sensible a producción, no permanentemente de solo lectura: cambios solo tras superar el gate de `docs/CONSTITUTION.md`, con destino verificado, prueba aislada y recuperación comprobada. PostgreSQL efímero es la primera línea de pruebas; Neon branch solo cuando añada validación adicional no cubierta por CI, con datos sintéticos, expiración y limpieza. No guardar cadenas de conexión. |
| Drizzle ORM | Esquema y migraciones versionadas. | https://orm.drizzle.team/docs/overview | Revisar migraciones y constraints en PostgreSQL temporal. |
| Vitest | Pruebas unitarias e integración. | https://vitest.dev/ | Registrar comando y resultado. |
| Playwright | Pruebas E2E escritorio/móvil. | https://playwright.dev/docs/intro | Ejecutar contra entorno local/preview aislado. |
| Trivy | Escaneo de dependencias, configuración y secretos en CI. | https://github.com/aquasecurity/trivy | Workflow actual es baseline no bloqueante; un resultado verde no significa ausencia de vulnerabilidades. |
| GitHub CodeQL | Alternativa de análisis estático. | https://github.com/github/codeql | Evaluar cobertura, permisos y cuota antes de activarlo. |
| Semgrep | Reglas estáticas de seguridad. | https://github.com/semgrep/semgrep · https://github.com/semgrep/semgrep-rules | Comparar cobertura/falsos positivos con CodeQL antes de duplicar escaneos. |
| OWASP ZAP | DAST contra staging aislado. | https://github.com/zaproxy/zaproxy | No hacer escaneo activo sobre producción ni sistemas ajenos. |

## Repositorios de inspiración POS

Solo inspiración funcional/arquitectónica; no copiar código ni asumir que licencias, seguridad o mantenimiento están aprobados. El inventario ampliado está en [INSPIRATION.md](INSPIRATION.md).

- OSPOS: https://github.com/opensourcepos/opensourcepos
- NexoPOS: https://github.com/Blair2004/NexoPOS
- Lakasir: https://github.com/lakasir/lakasir
- POSNext: https://github.com/PointOfSale/PointOfSale

## Repositorios y fuentes de seguridad

| Recurso | URL | Aplicación en Micro app |
|---|---|---|
| OWASP Cheat Sheet Series | https://github.com/OWASP/CheatSheetSeries | Guías prácticas de auth, sesiones, validación, logging y secretos. |
| OWASP ASVS | https://github.com/OWASP/ASVS | Catálogo de requisitos de verificación por riesgo. |
| OWASP API Security | https://github.com/OWASP/API-Security | Riesgos API, BOLA/IDOR, autenticación y autorización. |
| GitHub CodeQL | https://github.com/github/codeql | Análisis estático de código. |
| Semgrep | https://github.com/semgrep/semgrep | Motor de análisis estático. |
| Semgrep rules | https://github.com/semgrep/semgrep-rules | Reglas reutilizables; evaluar calidad y compatibilidad. |
| Trivy | https://github.com/aquasecurity/trivy | Dependencias, misconfiguración y detección de secretos. |
| OWASP ZAP | https://github.com/zaproxy/zaproxy | Pruebas dinámicas en staging autorizado. |
| OWASP Juice Shop | https://github.com/juice-shop/juice-shop | Blanco de entrenamiento aislado, no integrar código vulnerable. |
| Apache Casbin Node | https://github.com/apache/casbin-node-casbin | Solo reevaluar si las políticas crecen; verificar Workers y coste antes de adoptar. |
| express-rate-limit | https://github.com/express-rate-limit/express-rate-limit | Referencia conceptual solamente; no instalar directamente en Hono/Workers. |

## Fuentes oficiales para decisiones de arquitectura/coste

- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Pages: https://pages.cloudflare.com/
- Neon pricing: https://neon.com/pricing
- Vercel Hobby plan: https://vercel.com/docs/plans/hobby
- Vercel terms: https://vercel.com/legal/terms
- Neon serverless driver / transactions: https://github.com/neondatabase/serverless#sessions-transactions-and-node-postgres-compatibility
- Cloudflare Workers + Neon: https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/

Vercel Hobby no es el hosting objetivo para operación comercial. Reconfirmar condiciones antes de desplegar y mantener el coste $0.

## Registro de consulta

| Fecha | Fuente | Motivo | Resultado/estado |
|---|---|---|---|
| 2026-10-17 | Repositorios POS y recursos OWASP enumerados arriba | Definir inspiración y plan inicial de seguridad. | Documentados en `INSPIRATION.md` y `SECURITY_PLAN_2026.md`; la actividad y el estado actual requieren nueva consulta antes de adoptar. |
| 2026-10-18 | GitHub API: ramas, commits, contenido de docs y Actions del repositorio Micro-app | Corregir la continuidad obsoleta y comprobar el SHA actual. | `main` = `8574bef7c5bc38cb85e55007816b6efc8b54a826`; CI, migración y seguridad reportan success para ese SHA. |
| 2026-10-18 | `.github/workflows/ci.yml` en main | Verificar lockfile y pruebas reales declaradas. | Usa `pnpm install --frozen-lockfile`, build, unit tests y test de integración de auth con PostgreSQL efímero. |


## Gentleman-Programming y pruebas E2E — revisión documental 2026-10-18

Se inspeccionaron los README públicos actuales; el detalle, límites y decisiones está en [GENTLEMAN_PROGRAMMING_EVALUATION.md](GENTLEMAN_PROGRAMMING_EVALUATION.md).

| Recurso | URL | Conclusión verificable |
|---|---|---|
| Gentle-AI | https://github.com/Gentleman-Programming/gentle-ai | README lo presenta como entorno determinista de ingeniería para agentes con flujos/memoria/evidencia. Solo evaluado documentalmente; no instalado. |
| Engram | https://github.com/Gentleman-Programming/engram | README lo presenta como memoria persistente para agentes de programación. Candidato a prueba aislada; no conectado a este chat/repo. |
| Gentleman Guardian Angel | https://github.com/Gentleman-Programming/gentleman-guardian-angel | README describe revisión de cambios por IA y hook Git. No instalado; probar en entorno temporal antes de habilitar hooks. |
| Gentle Shell | https://github.com/Gentleman-Programming/gentle-shell | README describe un workspace de agente centrado en Pi. Referencia de diseño; compatibilidad/coste no aprobados. |
| Playwright | https://github.com/microsoft/playwright · https://playwright.dev/docs/intro | Framework E2E para navegadores; recomendado al llegar a pruebas de UI. No afirmar integrado hasta verificar package/config/tests. |

**Límite de evidencia:** leer un README no equivale a auditar el repositorio, verificar licencia/dependencias/release ni ejecutar el software. Ninguna herramienta de esta tabla debe considerarse instalada o activa sin una prueba registrada.


## Gentleman-Programming — estado de implementación (2026-10-18)

- Se añadió el archivo de configuración `.gga` al repositorio para usar Ollama local (`ollama:qwen2.5-coder`) y las reglas de `AGENTS.md`; no se instaló GGA ni Ollama, no se ejecutó una revisión y no se habilitó el hook.
- Se añadió `docs/GENTLEMAN_IMPLEMENTATION.md` con el procedimiento de instalación/verificación local para GGA, Engram y Gentle-AI, límites de coste y orden de adopción.
- Engram y Gentle-AI siguen sin instalarse ni conectarse a esta conversación. Para continuar, verificar las guías oficiales enlazadas en el documento y registrar versiones/comandos/resultados observados.
- Commit de configuración: `ae0c189487b37d910184b0b5cfa058ddbb6919d4`.


## Implementación adicional de herramientas investigadas — 2026-10-18

| Recurso | Cambio real en la rama `feat/security-e2e-tooling` | Estado/límite |
|---|---|---|
| Playwright | `apps/web/playwright.config.ts`, `apps/web/e2e/auth.spec.ts` y `.github/workflows/playwright-e2e.yml`; Chromium y API simulada. | Piloto de CI; Playwright E2E terminó en success para SHA `c0bab00aeaee21a4848d6efd5fcf5c5066a5b582`. Sigue pendiente fijar dependencia en `pnpm-lock.yaml`; no prueba la API real ni despliegue. |
| Semgrep | `.github/workflows/semgrep.yml`, reglas JavaScript/TypeScript y artefacto SARIF. | Workflow agregado; Semgrep terminó en success para SHA `c0bab00aeaee21a4848d6efd5fcf5c5066a5b582` y el artefacto SARIF se generó. No se sube a GitHub Code Scanning ni se bloquean merges por hallazgos aún. |
| OWASP ASVS | `docs/OWASP_ASVS_CHECKLIST.md`. | Checklist de controles con casillas sin marcar hasta contar con evidencia; no es certificación. |
| POS de referencia | `docs/POS_REFERENCE_MATRIX.md`. | Requisitos convertidos en pruebas/criterios; no se copia código ni se importan licencias/dependencias. |
| Trivy | Workflow preexistente `.github/workflows/security-scan.yml`. | Se mantiene baseline no bloqueante; un workflow verde no demuestra ausencia de vulnerabilidades. |
| OWASP ZAP / Juice Shop | Se conservan como siguiente fase DAST/laboratorio en checklist. | No se ejecuta escaneo dinámico sin un entorno local/preview autorizado; no se apunta a producción. |
| CodeQL / Casbin / express-rate-limit | Se mantienen como opciones evaluadas. | No se activan: revisar coste/permisos y compatibilidad con Hono/Workers antes de adoptarlos. |

Fuentes oficiales: https://playwright.dev/docs/intro · https://github.com/semgrep/semgrep · https://github.com/OWASP/ASVS · https://github.com/zaproxy/zaproxy · https://github.com/juice-shop/juice-shop.


## Strix — evaluación de pruebas dinámicas (2026-10-18)

| Recurso | URL | Aplicación y límites |
|---|---|---|
| Strix | https://github.com/usestrix/strix | Evaluación dinámica de seguridad de API/aplicaciones. Usar solo en laboratorio local/efímero o staging autorizado, con datos sintéticos. Requiere Docker y proveedor LLM; verificar coste $0 antes de ejecutar. No instalado ni ejecutado. |

Plan de adopción: [STRIX_INTEGRATION.md](STRIX_INTEGRATION.md). Complementa Semgrep, Trivy, Playwright y OWASP ASVS; no reemplaza revisión humana ni pruebas específicas de autorización. No usar en producción ni en sistemas ajenos. La integración en CI queda pendiente de evaluación independiente.


## Continuidad — estado de PR y Strix (2026-10-18)

| Recurso | Estado comprobado | Próximo uso |
|---|---|---|
| PR #19 — decisiones de autenticación | Fusionada en `main`, merge/HEAD `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`. D1–D8 siguen siendo opciones propuestas, no política aprobada. | Leer el registro de decisiones antes de diseñar OAuth/allowlist; no inventar reglas. |
| PR #20 — adopción controlada de Strix | Fusionada previamente, merge SHA `c87361685ef1ce36e4cf6025124b09e70ffa0846`. | Usar `STRIX_INTEGRATION.md` para una futura evaluación aislada. |
| GitHub Actions en main | CI, Playwright E2E, validación de migraciones, Semgrep, Security scan y dashboard: success para SHA `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`. | Verificar de nuevo el SHA exacto antes de declarar el estado actual. |
| Strix | Documentado; no instalado ni ejecutado, sin informe ni proveedor LLM conectado. | Solo cuando API y PostgreSQL efímero estén listos; laboratorio autorizado, datos sintéticos y coste $0. |

El handoff incluye el prompt copiable para continuar en un chat nuevo. La documentación no hace que otra IA recuerde automáticamente: debe leer los archivos del repositorio y verificar el estado vivo.


## Consulta viva de repositorio — 2026-10-18

| Recurso | Consulta/evidencia | Conclusión y límite |
|---|---|---|
| GitHub `main` | API `GET /repos/BTF14/Micro-app/branches/main`; SHA `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`. | Confirmado en esta sesión; volver a consultar antes de operar. La rama no está protegida y no tiene checks requeridos. |
| PR #21 | [PR #21](https://github.com/BTF14/Micro-app/pull/21), head `fb9ab271cc8b1c72e92d7874672913698c59bfe7`. | Abierta/no fusionada. CI, E2E, migraciones, Semgrep, Security y dashboard success para ese SHA. Bot Codex reportó revisión fallida/hallazgos, pero sin comentario inline/review formal recuperable; no tratarlo como aprobación. |
| Auth/API+DB | `apps/api/src/auth.ts` y `apps/api/src/auth.integration.test.ts` en main. | Integración de contraseña/sesión contra PostgreSQL efímero existe en CI; no prueba Google OAuth/allowlist ni matriz completa de tenant. Registro sigue sin allowlist: P0 abierto. |
| Decisiones de identidad | `docs/sdd/auth-policy-decision-record.md`. | D1–D8 son propuestas no aprobadas; no inventar política ni configurar OAuth por suposición. |
| Strix | [Repositorio Strix](https://github.com/usestrix/strix), [plan local](STRIX_INTEGRATION.md). | Documentado, no instalado ni ejecutado; no se escaneó Micro app ni se creó workflow Strix. Coste $0/aislamiento aún son gates antes de cualquier prueba. |

## Estado posterior a PR #21 — 2026-10-18

| Recurso | Estado comprobado | Nota |
|---|---|---|
| PR #21 | Fusionada por squash; commit `7491b97a2bde52555fe9b8a5d808ad81b829d90e`. | Solo documentación. |
| GitHub Actions para el HEAD de PR #21 | 7 workflows en `success`. | Evidencia del SHA de la PR; no equivale a validación de producción. |
| Revisión Codex | Fallida/no completada por límite de uso; sin hallazgo técnico concreto recuperable. | No registrar como aprobación formal. |
| Auth/allowlist P0 | Sigue pendiente. | D1–D8 continúan propuestas sin aprobación; no inventar políticas. |
| Strix | Documentado, no instalado ni ejecutado. | Solo laboratorio aislado con datos sintéticos y coste $0 verificado. |


## AutoSkills y skills de agentes — evaluación 2026-10-19

| Recurso | Uso evaluado | Resultado y límite |
|---|---|---|
| AutoSkills | https://www.autoskills.sh/ · https://github.com/midudev/autoskills | Ejecutado `npx --yes autoskills@0.4.1 --dry-run --verbose` en GitHub Actions, Node 22.23.3; success. Detectó el stack real y propuso 19 skills. Preview solamente: no instaló paquetes ni generó `skills-lock.json`. El shell local continúa sin DNS para `github.com`. |
| React / TypeScript / Vite / Hono en AutoSkills | https://github.com/midudev/autoskills/tree/main/packages/autoskills/skills-registry | Leídas entradas de React best practices, TypeScript advanced types, Vite y Hono. No se copian bundles enteros ni se aplica Vite 8 sin validar compatibilidad con Vite 7 del proyecto. |
| AutoSkills GitHub Actions | https://github.com/BTF14/Micro-app/actions/runs/39300536264 | Run `39300536264`, job `118224260673`, head `09f17020f7543439ed822726419de9777d34fa08`: success. Propuso, entre otras, `neon-postgres`, `workers-best-practices`, `hono`, `vitest`, `react-best-practices`, `playwright-best-practices`, `vite`; también sugirió `migrate-to-vinext` y `cloudflare-deploy`, que deben rechazarse sin una decisión explícita. |
| Secure code review | https://www.skills.sh/unitoneai/securityskills/secure-code-review | Referencia de procedimiento de revisión de seguridad; usada como investigación, no instalada. |
| Auth review | https://www.skills.sh/descope/skills/auth-review | Referencia para inventario de endpoints y límites de autenticación/autorización; usada como investigación, no instalada. |
| PostgreSQL development / database testing | https://www.skills.sh/ingpoc/skills/postgresql-skill · https://www.skills.sh/petrkindlmann/qa-skills/database-testing | Referencias para transacciones, migraciones, aislamiento y pruebas de DB; no instaladas. |
| Skills locales Micro app | `.agents/skills/micro-app-auth-security/SKILL.md`, `micro-app-postgres-testing/SKILL.md`, `micro-app-stack-guidance/SKILL.md`, `micro-app-skill-curation/SKILL.md` | Instrucciones propias, adaptadas al stack y a las políticas del repo. No equivalen a bundles descargados/verificados por AutoSkills; no ejecutan scripts ni añaden dependencias. |

Decisión: en un checkout con red, ejecutar primero `npx autoskills --dry-run`, comparar las propuestas con los manifiestos actuales, seleccionar solo skills relevantes y revisar origen/licencia/estado de seguridad/hash antes de instalar. No usar `-y` por defecto, no instalar skills de Next.js/Supabase/Astro si esas tecnologías no están en uso, y no gastar dinero. Mantener separadas las skills locales propias y las externas verificadas.


## Registro de verificación — Cloudflare 2026-10-30 (sesión autenticada, solo lectura)

- **Workers `micro-app-api`:** Active Deployment en Producción; versión `49975c43-4161-4809-9c00-8ba83e53e6a0`, Build ID `957478f6-0f43-4b5c-932a-621be067d6d9`, commit `82386c6e9300e06f8fa209aa52995b939a72442a`; el panel mostró 100% de asignación de tráfico.
- **Pages `micro-app`:** rama de producción `main`, SHA `82386c6e9300e06f8fa209aa52995b939a72442a`, deployment `https://cc23ff0c.micro-app-63i.pages.dev`; la lista visible de variables de entorno estaba vacía y `VITE_API_BASE_URL` no aparecía.
- **Conclusión:** queda resuelta la duda sobre si el build de Worker de #177 corresponde a una versión activa de Producción. No queda resuelta la integración frontend/API ni CORS. Investigar la variable ausente en solo lectura y obtener preflight HTTP real.
- **Límites:** no se modificaron variables, secretos, tráfico, deployments, DNS, billing ni producción; no se revelaron valores sensibles. La vista de métricas mostró 0 req/sec y 0% errores en el instante observado, lo cual no demuestra CORS ni ausencia de tráfico histórico.
