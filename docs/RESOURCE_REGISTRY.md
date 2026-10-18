# Registro de herramientas, repositorios y fuentes de Micro app

Actualizado: 2026-10-18. Este registro no sustituye la verificación en vivo: planes gratuitos, documentación y estado de repositorios cambian. Añadir cada fuente consultada con fecha, uso, conclusión y limitaciones. No registrar secretos ni URLs que contengan credenciales.

## Herramientas y servicios del proyecto

| Herramienta/servicio | Uso previsto | Documentación oficial | Control/precaución |
|---|---|---|---|
| GitHub repository/actions | Código, PR, revisión, CI, escaneo y continuidad persistente. | https://docs.github.com/en/actions · https://docs.github.com/en/rest | Verificar SHA y workflow; no asumir que queued significa success. |
| pnpm 10 / workspace | Gestor de paquetes para `apps/*`. | https://pnpm.io/ | `pnpm-lock.yaml` está versionado; CI debe usar instalación congelada. |
| React + Vite + TypeScript | Frontend web responsive. | https://react.dev/ · https://vite.dev/ · https://www.typescriptlang.org/docs/ | Validar formularios y errores; la UI nunca es frontera de autorización. |
| Cloudflare Pages | Hosting estático objetivo para frontend. | https://pages.cloudflare.com/ | Reconfirmar límites/condiciones y no desplegar producción sin aceptación. |
| Cloudflare Workers + Hono | API separada con estándares web. | https://developers.cloudflare.com/workers/ · https://hono.dev/ | No asumir compatibilidad de middleware diseñado para Express. |
| Neon PostgreSQL | Base de datos dedicada `micro-app-db`, plan Free según estado previo documentado. | https://neon.com/docs · https://neon.com/pricing | Neon main solo lectura; pruebas/migraciones en PostgreSQL efímero o rama aislada. No guardar cadenas de conexión. |
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

