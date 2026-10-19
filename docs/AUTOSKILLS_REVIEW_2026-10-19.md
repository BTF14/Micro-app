# AutoSkills: revisión individual de las 19 propuestas

Fecha de revisión: 2026-10-19. Repositorio: [BTF14/Micro-app](https://github.com/BTF14/Micro-app).

## Resultado

- El preview oficial AutoSkills 0.4.1 fue exitoso en [GitHub Actions run 39300536264](https://github.com/BTF14/Micro-app/actions/runs/39300536264), para SHA `09f17020f7543439ed822726419de9777d34fa08`. El comando fue `npx --yes autoskills@0.4.1 --dry-run --verbose`: detectó el stack y propuso 19 skills, pero **no instaló ninguna**.
- Se incorporan en esta rama **dos skills externas**: `accessibility` y `typescript-advanced-types`. Sus licencias upstream son MIT, se preservan sus archivos LICENSE, se copiaron sus referencias completas y se añadieron overlays explícitos de seguridad/compatibilidad de Micro app. No se añadieron dependencias, no se ejecutaron scripts de las skills y no se tocó la aplicación ni la base de datos.
- No se usó el instalador AutoSkills para instalar porque el paquete `autoskills@0.4.1` declara `CC-BY-NC-4.0`, incompatible como dependencia de tooling por defecto para un producto orientado a uso comercial. Se reutilizó solo contenido de skills con licencias upstream permisivas verificadas individualmente.
- `skill-install-log.json` es el **registro propio del proyecto**, no el `skills-lock.json` oficial de AutoSkills. No se inventa un lockfile oficial: el preview fue dry-run y el contenido de `skills-registry/index.json` no se pudo recuperar por el conector, así que no se pudo verificar su `bundleHash`/security-review metadata oficial.
- Los 19 archivos fuente `SKILL.md` están fijados a la revisión inmutable `b4489cbdc36ba8c9de8f4dd844bab0b6b559579f` del registro AutoSkills y el log registra su Git blob SHA-1. Para cada archivo instalado se registra también SHA-256 y el Git blob SHA-1 del archivo resultante. Los dos `SKILL.md` instalados fueron modificados intencionalmente para añadir límites de proyecto; los cambios están documentados en el JSON.
- El workflow `.github/workflows/skill-integrity.yml` valida el JSON, el conjunto de skills aprobadas, las licencias presentes, tamaño, SHA-256 y Git blob SHA-1. Su resultado CI para este PR queda pendiente hasta que GitHub ejecute el workflow.

## Revisión de cada candidata

| Skill propuesta | Licencia / procedencia revisada | Compatibilidad con Micro app | Decisión |
|---|---|---|---|
| `typescript-advanced-types` | MIT; upstream `wshobson/agents`; blob fijado en el registro. | TypeScript 5.9; paquete pequeño con una referencia; sin dependencias. | **Instalada** en `.agents/skills/external-typescript-advanced-types/`; se añadió un overlay de versión/política. |
| `nodejs-backend-patterns` | MIT; upstream `wshobson/agents`. | Centrada en Express/Fastify; la API usa Hono y ya existe `micro-app-stack-guidance`. | Rechazada por redundancia/incompatibilidad de enfoque. |
| `nodejs-best-practices` | Licencia upstream no verificada; el propio frontmatter marca `risk: critical` y `source: community`. | Solapamiento de patrones de backend. | Rechazada: no instalar con licencia/riesgo sin resolver. |
| `neon-postgres` | Apache-2.0; upstream `neondatabase/agent-skills`. | Requiere la skill padre `neon`; incluye orientación para seleccionar proyectos, obtener `DATABASE_URL` y operaciones de DB. El proyecto ya tiene una skill propia de pruebas PostgreSQL con guardrails. | Diferida; no introducir guía que pueda incentivar acceso/mutación no aprobados. |
| `cloudflare` | Apache-2.0; upstream `cloudflare/skills`. | Guía genérica de elección de producto/CLI; duplica el stack guidance y puede cambiar el flujo de herramientas. | Diferida. |
| `wrangler` | Apache-2.0; upstream `cloudflare/skills`. | Potencialmente útil si coincide con la configuración efectiva; necesita revisión de applicability y solapamiento. | Diferida; sin nuevas dependencias. |
| `workers-best-practices` | Apache-2.0; upstream `cloudflare/skills`. | Relevante, pero incluye referencias auxiliares y solapa con la guía local del stack. | Diferida; no se copia un bundle incompleto. |
| `web-perf` | Apache-2.0; upstream `cloudflare/skills`. | Útil para un trabajo específico de Core Web Vitals, no un bloqueo actual. | Diferida. |
| `cloudflare-deploy` | Licencia del repositorio upstream `openai/skills` no expuesta/verificada en esta revisión. | Instrucciones de despliegue; Micro app no tiene autorización para despliegue productivo. | Rechazada. |
| `hono` | MIT; upstream `honojs/skills`. | Compatible con la API, pero la skill recomienda instalar `@hono/cli@next` si falta. No hay necesidad probada de esa dependencia. | Diferida para evitar dependencias innecesarias. |
| `vitest` | MIT; upstream `antfu/skills`. | El bundle declara estar basado en Vitest 5.0.1; el proyecto usa Vitest 3.2.4. | Rechazada por desajuste de versión. |
| `react-best-practices` | MIT declarado en el frontmatter de la skill; el metadata del repositorio no expuso licencia. | React 19 sí coincide, pero el bundle contiene muchos archivos de reglas y contenido específico de Next.js/servidor. | Diferida; no copiar solo una parte y fingir instalación completa. |
| `composition-patterns` | MIT declarado en el frontmatter; repositorio sin licencia metadata en la API consultada. | Patrones React 19 relevantes, pero bundle con referencias y solapamiento con skill local. | Diferida. |
| `playwright-best-practices` | MIT declarado y metadata del repositorio MIT; upstream `currents-dev/playwright-best-practices-skill`. | Relevante, pero extensa y solapa con convenciones Playwright existentes. | Diferida hasta una tarea E2E concreta. |
| `vite` | MIT; upstream `antfu/skills`. | El contenido está basado en Vite 8.3.1/Rolldown; el proyecto usa Vite 7.1.7. | Rechazada por incompatibilidad de versión. |
| `migrate-to-vinext` | Apache-2.0; upstream `cloudflare/skills`. | Solo para migrar Next.js a Vinext; Next.js no está declarado. | Rechazada por irrelevante. |
| `frontend-design` | `SKILL.md` remite a términos en `LICENSE.txt`; esos términos separados no fueron aprobados/verificados. | No necesaria para la revisión de ingeniería actual. | Rechazada por licencia pendiente y alcance. |
| `accessibility` | MIT; upstream `addyosmani/web-quality-skills`; LICENSE upstream incluido. | Relevante para UI responsive; bundle completo de tres Markdown más licencia; cero dependencias. | **Instalada** en `.agents/skills/external-accessibility/`; se corrigió una referencia interna rota y se añadió overlay de seguridad. |
| `seo` | MIT; upstream `addyosmani/web-quality-skills`. | SEO público no es un requisito actual para el POS autenticado. | Rechazada por irrelevante al objetivo actual. |

## Integridad y límites de verificación

1. Fuente de las propuestas: salida real de AutoSkills CLI en el run enlazado arriba.
2. Fuente de los archivos instalados: registro de AutoSkills en el commit inmutable `b4489cbdc36ba8c9de8f4dd844bab0b6b559579f`; cada archivo fuente mantiene su Git blob SHA-1 en `skill-install-log.json`.
3. Licencias: MIT comprobada en los repositorios upstream de las dos skills instaladas; sus archivos LICENSE están versionados junto a cada skill.
4. Hashes de archivos instalados: SHA-256 y Git blob SHA-1 esperados registrados; el script de CI vuelve a calcularlos desde el checkout. Los overlays locales se reflejan mediante distintos hashes fuente/instalado en el log.
5. No se ejecutaron comandos de las skills, no se instalaron paquetes npm, no se modificaron manifests/lockfiles de aplicación, no se accedió a Neon y no se desplegó nada.
6. No se verificó el hash SHA-256 del bundle oficial AutoSkills ni el estado de revisión de seguridad del manifest porque el conector no devolvió el contenido de `skills-registry/index.json`. No afirmar que esa validación oficial ocurrió.

## Archivos y evidencia

- Registro estructurado: [`skill-install-log.json`](../skill-install-log.json).
- Skills instaladas: [accessibility](../.agents/skills/external-accessibility/SKILL.md), [typescript-advanced-types](../.agents/skills/external-typescript-advanced-types/SKILL.md).
- Fuente de las propuestas y resultado: [AutoSkills run 39300536264](https://github.com/BTF14/Micro-app/actions/runs/39300536264).
