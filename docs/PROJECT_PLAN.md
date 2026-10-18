## Checkpoint actual — Gentleman-Programming (2026-10-18)

Se comenzó la implementación real en el commit `ae0c189487b37d910184b0b5cfa058ddbb6919d4`: `.gga` preparado para revisión local mediante Ollama, guía de implementación y enlace en README. **Aún no están instalados/ejecutándose GGA, Ollama, Engram ni Gentle-AI desde este entorno.** Verifica las tres Actions enlazadas en el handoff para el SHA exacto antes de declarar estado CI.

Siguiente prioridad de esta línea: probar GGA manualmente en un terminal local sin instalar el hook hasta validar el proveedor; luego Engram y Gentle-AI en un runtime compatible. Coste $0 y guardrails existentes permanecen obligatorios.

---

# Checkpoint vigente — 2026-10-18

> Este checkpoint se añade como referencia más reciente; las secciones históricas inferiores pueden contener snapshots antiguos. Antes de trabajar, verificar HEAD/Actions en vivo y registrar cualquier corrección.

- `main` verificado: `12c0037f3928b2c54c3593d3f48a65bf3318f401`.
- CI, validación de migración y escaneo de seguridad terminaron en success para ese SHA: [CI](https://github.com/BTF14/Micro-app/actions/runs/39102740451), [migración](https://github.com/BTF14/Micro-app/actions/runs/39102740448), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/39102740511).
- Handoff y prompt de continuidad: [docs/HANDOFF_NEXT_CHAT.md](HANDOFF_NEXT_CHAT.md).
- Evaluación de Gentleman-Programming (documental, sin instalación): [docs/GENTLEMAN_PROGRAMMING_EVALUATION.md](GENTLEMAN_PROGRAMMING_EVALUATION.md).
- Bloqueo P0 de identidad: revisar Google OAuth + allowlist + verificación de email; la revisión estática de `apps/api/src/auth.ts` no encontró esos componentes.
- Rama `feat/neon-transaction-adapter` requiere comparación y revisión de diff antes de rescatar cambios.
- Mantener $0, proyecto separado de Cantina-pos, sin mutaciones en Neon main, sin deploy de producción y sin secretos en Git.

---

## Estado vivo verificado — 2026-10-18 (prevalece sobre el historial inferior)

- Último SHA de `main` comprobado antes de este checkpoint documental: `995608af8584442a9f174f9cf55ed7861749b872` (`docs: refresh handoff with current repository state`).
- En el SHA anterior `8574bef7c5bc38cb85e55007816b6efc8b54a826`, [CI](https://github.com/BTF14/Micro-app/actions/runs/39102311090), [Database migration validation](https://github.com/BTF14/Micro-app/actions/runs/39102311097) y [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39102311100) terminaron en `success`. Para el SHA `995608af8584442a9f174f9cf55ed7861749b872`, las nuevas ejecuciones estaban `pending/queued` al consultarlas: [CI](https://github.com/BTF14/Micro-app/actions/runs/39102649341), [Database migration validation](https://github.com/BTF14/Micro-app/actions/runs/39102649354) y [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39102649347). Reconsultar el SHA más reciente después de este commit documental; los checks verdes no demuestran que el producto esté listo para producción.
- El CI actual usa `pnpm install --frozen-lockfile`, ejecuta build, pruebas unitarias y `src/auth.integration.test.ts` con PostgreSQL efímero. La migración también se valida contra PostgreSQL desechable; no se ha autorizado migrar Neon main.
- `pnpm-lock.yaml` existe en main (tamaño 77,520 bytes al consultar el contenido de GitHub). La afirmación histórica de que no había lockfile ya no describe main.
- El último commit de código anterior a los documentos es `88d30d472905c81a90d9fffc967e3ba1df5084d1`, que conectó el flujo frontend de registro/login con la API. El contenido de `docs/API_INTEGRATION.md` conserva una frase antigua que dice lo contrario; debe corregirse para evitar contradicción.
- La rama `feat/neon-transaction-adapter` está en `7989a84e39536029819735a5202f3934a8eb12c3`; no se fusionó automáticamente. Debe revisarse su diff completo con respecto a main antes de decidir qué rescatar.
- Otras ramas que existen al comprobar GitHub: `feat/auth-session-foundation`, `feat/frontend-auth-flow`, `feat/tenant-safe-schema`, `fix/pnpm-lockfile-bootstrap` y `main`. Los SHA de las ramas pueden avanzar; volver a consultarlos antes de trabajar.
- Ya hay material persistente en `docs/INSPIRATION.md`, `docs/SECURITY_PLAN_2026.md`, `docs/API_INTEGRATION.md`, `docs/ARCHITECTURE_AND_ZERO_COST.md`, `docs/DATABASE_SCHEMA.md`, `docs/SCHEMA_REVIEW.md` y `docs/COMPLIANCE_REQUIREMENTS.md`. La continuidad debe enlazar y reconciliar estos documentos, no sustituirlos por un resumen corto.
- **Bloqueo de requisitos de identidad detectado en revisión del código:** `apps/api/src/auth.ts` solo expone `POST /auth/register`, `POST /auth/login`, `GET /auth/me` y `POST /auth/logout`; no se encontró implementación de Google OAuth, allowlist ni verificación de email. La prueba de integración `apps/api/src/auth.integration.test.ts` tiene un escenario principal de registro/login/sesión/revocación, no la matriz completa de autorización. Esto contradice el requisito previamente acordado de acceso Google + allowlist y debe tratarse como P0 antes de considerar identidad lista; no declarar producción-ready. No cambiar el modelo de identidad ni enviar correos sin decisión del usuario.
- Se añaden el modelo operativo de agentes, el registro de recursos y el diario de estado. Los archivos `.github/agents/*.agent.md` definen roles reutilizables en entornos compatibles con agentes; no implican que GitHub Actions ni este chat estén ejecutando agentes autónomos en segundo plano.

# Micro app — plan maestro y estado de continuidad

## Índice de memoria operativa persistente

- [Plan maestro](PROJECT_PLAN.md)
- [Modelo operativo de agentes/subagentes](AGENT_OPERATING_MODEL.md)
- [Registro de herramientas, repositorios y fuentes](RESOURCE_REGISTRY.md)
- [Diario cronológico de estado y decisiones](STATE_JOURNAL.md)
- [Inspiración POS](INSPIRATION.md)
- [Plan de ciberseguridad 2026](SECURITY_PLAN_2026.md)
- [Integración API/Neon](API_INTEGRATION.md)
- [Arquitectura y coste cero](ARCHITECTURE_AND_ZERO_COST.md)
- [Esquema de base de datos](DATABASE_SCHEMA.md) · [Revisión del esquema](SCHEMA_REVIEW.md) · [Cumplimiento](COMPLIANCE_REQUIREMENTS.md)

**Última actualización:** 2026-10-18  
**Repositorio:** https://github.com/BTF14/Micro-app  
**Rama base de referencia:** `main`  
**Propósito:** documento operativo para que cualquier nuevo chat o colaborador pueda continuar el trabajo sin depender del historial de conversación.

> Este documento es la fuente de verdad del plan y del estado conocido. Antes de actuar, comprobar el SHA actual de `main`, las ramas/PR abiertos y GitHub Actions. Si el repositorio ha cambiado desde esta actualización, corregir el estado aquí mediante un commit.

## 1. Objetivo del producto

Crear un punto de venta (POS) y sistema de inventario profesional para PC, tablet y teléfono, con:

- Catálogo de productos, códigos de barras, categorías, proveedores y alertas de bajo inventario.
- Entradas, salidas, ajustes y trazabilidad del inventario.
- Caja y ventas, descuentos autorizados, pagos mixtos, cálculo de cambio, recibos, devoluciones y cierres.
- Informes y auditoría de operaciones.
- Autenticación, sesiones revocables, roles y aislamiento estricto entre organizaciones/comercios.
- USD como moneda base y conversión a VES usando una tasa BCV validada, con fuente, fecha efectiva y hora de consulta.
- Interfaz responsive, accesible y usable por teclado; temas automático (sistema), claro y oscuro, con preferencia manual persistente.
- Pruebas unitarias, integración con PostgreSQL desechable y E2E en vistas de escritorio/móvil.

No presentar la aplicación como lista para operar un comercio hasta que las funciones, autorización, persistencia, pruebas y configuración de despliegue hayan sido implementadas y verificadas.

## 2. Restricciones no negociables

1. **Neon main no está autorizado para migraciones.** Se permite inspección de solo lectura en la rama principal. Las migraciones y pruebas se preparan y validan en PostgreSQL efímero o en ramas desechables aisladas. No ejecutar cambios sobre Neon main sin autorización explícita y específica posterior.
2. **Coste total objetivo: $0.** No activar facturación, planes de pago, suscripciones ni cargos automáticos. Antes de crear recursos, comprobar que sean gratuitos y sus límites.
3. **Independencia total:** no reutilizar repositorios, bases de datos, secretos, despliegues, dominios ni configuración de Cantina-pos u otros proyectos.
4. No desplegar a producción ni hacer cambios irreversibles sin aceptación del usuario.
5. No imprimir, registrar, versionar ni compartir secretos, tokens, contraseñas o cadenas de conexión. Usar variables de entorno locales ignoradas y gestores de secretos.
6. Hacer cambios reales, pequeños y verificables; actualizar el plan en el repositorio. No afirmar que una prueba o workflow pasó sin revisar el resultado real del SHA correspondiente.
7. No pedir al usuario que repita conexiones/permisos ya configurados, salvo que se haya identificado un bloqueo concreto y comprobable.

## 3. Arquitectura objetivo

- **Frontend:** React + Vite + TypeScript; despliegue estático previsto en Cloudflare Pages.
- **API:** Hono + TypeScript sobre Cloudflare Workers.
- **Base de datos:** PostgreSQL independiente en Neon Free; migraciones versionadas y revisadas.
- **CI:** GitHub Actions; pruebas, compilación/typecheck y escaneos de seguridad.
- **Pruebas:** Vitest, PostgreSQL temporal para integración, Playwright para E2E.
- **Dependencias:** open source y sin componentes premium. Mantener la aplicación portable.
- No usar Vercel Hobby como alojamiento objetivo para un POS comercial. No crear recursos facturables para sortear límites gratuitos.

## 4. Estado del repositorio al preparar este documento

### Referencia comprobada

- La rama `main` se encontraba en el commit `88d30d472905c81a90d9fffc967e3ba1df5084d1`, mensaje `Connect frontend sign-in and registration to auth API`.
- PR #4 (`Add initial authentication and revocable sessions`) figura como **fusionado** el 2026-10-17, con merge commit `e9e146020e7195c12da5f880a5dbf26b4e96752c`.
- El commit de integración del frontend declara que CI, escaneo de seguridad y validación de migración pasaron. Reconfirmar los workflows de la punta actual de `main` antes de usar esto como garantía de estado actual.
- La rama `feat/neon-transaction-adapter` existía y, al compararla con `main`, tenía 14 commits por delante y 5 por detrás. Incluye trabajo adicional de adaptador de base de datos, pruebas y plan de seguridad. **No asumir que esa rama es segura para fusionar**: primero sincronizar/revisar el diff, evitar sobrescribir cambios posteriores de `main` y verificar cada workflow. No mezclarla a ciegas.
- Ramas observadas: `feat/auth-session-foundation`, `feat/frontend-auth-flow`, `feat/neon-transaction-adapter`, `feat/tenant-safe-schema`, `fix/pnpm-lockfile-bootstrap` y `main`. Reconsultar su estado real al continuar.
- El documento de transferencia anterior tenía secciones históricas contradictorias. Esta sección y el archivo `docs/HANDOFF_NEXT_CHAT.md` actualizado deben prevalecer sobre anotaciones antiguas.

### Ya presente en el código (revalidar en archivos/CI)

- Base de frontend React/Vite y API Hono/Workers.
- Rutas de autenticación inicial: registro, login, sesión actual y logout/revocación.
- Hash de contraseñas PBKDF2-SHA-256 y almacenamiento de hashes de tokens de sesión.
- Cookie HttpOnly, comprobación de origen configurado y límites de intentos persistidos en base de datos.
- Integración inicial de pantallas de registro/login del frontend con la API.
- Esquema/migración SQL versionados y workflows de validación en PostgreSQL temporal.
- Escaneo de seguridad con Trivy incorporado en una rama de trabajo; confirmar si el workflow y el archivo de plan ya están en `main` antes de darlos por integrados.

### Aún no debe considerarse listo

- No hay POS comercial completo ni flujo de ventas/inventario terminado.
- No declarar autenticación lista para producción sin pruebas de integración completas, revisión de seguridad, limpieza/retención de sesiones y límites, configuración de cookies/orígenes para los dominios finales y verificación del CI actual.
- No hay integración BCV terminada.
- No hay despliegue de producción aprobado.
- La migración de esquema no debe aplicarse a Neon main sin autorización expresa.

## 5. Plan por fases y criterios de salida

### Fase 0 — Base reproducible, seguridad y CI (P0)

- [ ] Comprobar `main`, PRs, commits y Actions más recientes.
- [ ] Confirmar instalación reproducible y lockfile real de pnpm; nunca inventar un lockfile.
- [ ] Revisar `.gitignore`, ejemplos `.env.example`, Wrangler y manejo de secretos.
- [ ] Revisar workflows y permisos mínimos; escaneo de dependencias/configuración/secretos.
- [ ] Mantener documentación de arquitectura, amenazas, pruebas y decisiones.
- **Salida:** CI verde en el SHA actual; sin secretos versionados; instrucciones locales reproducibles.

### Fase 1 — Autenticación, sesiones y aislamiento multiempresa (P0)

- [ ] Completar pruebas de integración HTTP con PostgreSQL efímero: registro, creación atómica de usuario/organización/membresía/sesión, email duplicado, login correcto/incorrecto, `/auth/me`, usuario o membresía inactivos, logout, revocación y fallos de DB.
- [ ] Verificar que un fallo de revocación no se reporte como logout exitoso.
- [ ] Probar autorización por organización en cada consulta y operación; evitar BOLA/IDOR y escalada de privilegios.
- [ ] Revisar rate limiting, retención/limpieza de contadores y limpieza de sesiones expiradas.
- [ ] Validar expiración de sesión, origen permitido, cookie HttpOnly/Secure/SameSite según despliegue, mensajes de error genéricos y manejo de datos malformados.
- [ ] Definir recuperación de cuenta/verificación de email/MFA solo con decisión de producto y opciones gratuitas verificadas; no añadir servicios de pago.
- **Salida:** pruebas de integración fiables y autorización del lado del servidor. No fusionar código no revisado solo porque un workflow esté verde.

### Fase 2 — Datos y adaptador PostgreSQL (P0)

- [ ] Revisar el trabajo de `feat/neon-transaction-adapter` contra el `main` actual, archivo por archivo; sincronizar la rama antes de considerar PR.
- [ ] Probar adaptador y transacciones contra PostgreSQL temporal, con pruebas de errores y rollback.
- [ ] Validar migraciones desde cero y restricciones en base efímera.
- [ ] Confirmar aislamiento multiempresa mediante claves foráneas/consultas y pruebas cruzadas.
- [ ] Mantener el esquema en revisión; Neon main solo lectura hasta autorización.
- **Salida:** integración de DB probada sin depender de Neon principal.

### Fase 3 — Catálogo e inventario (P0)

- [ ] CRUD de productos/categorías y códigos de barras con validación de servidor.
- [ ] Proveedores y recepción de mercancía.
- [ ] Movimientos de inventario auditables: entradas, salidas, ajustes y motivo/usuario.
- [ ] Política explícita de stock negativo; controles seguros ante concurrencia.
- [ ] Alertas de inventario bajo.
- **Salida:** cada cambio de existencia se explica mediante un movimiento persistido y autorizado.

### Fase 4 — Tasa USD/VES (P0 para conversión)

- [ ] Elegir una fuente verificable y revisar términos, disponibilidad y límites gratuitos.
- [ ] Guardar fuente, valor, fecha efectiva, fecha/hora de consulta y estado.
- [ ] Validar tasa positiva y respuesta; conservar última tasa válida ante fallos y avisar de datos desactualizados.
- [ ] No marcar una tasa obsoleta solo porque sea fin de semana/feriado si sigue vigente.
- [ ] Evitar afirmar que un tercero es una API oficial del BCV sin evidencia.
- **Salida:** pruebas de respuestas inválidas, retrasos, fallos y cambios de tasa; historial auditable.

### Fase 5 — Caja, ventas y devoluciones (P0)

- [ ] Carrito, búsqueda/escaneo, descuentos sujetos a permisos y cálculo de totales.
- [ ] Venta, pagos, cambio, stock, movimientos y auditoría dentro de una transacción atómica.
- [ ] Idempotencia por organización; misma clave con payload distinto debe rechazarse.
- [ ] Guardar instantáneas inmutables de descripción/precio/tasa USD/VES usados en cada venta.
- [ ] Usar precisión decimal en PostgreSQL y aritmética decimal segura; no persistir importes mediante aritmética flotante JS.
- [ ] Reintentos no duplican ventas; concurrencia no consume stock de más; fallo revierte todo.
- [ ] Devoluciones/anulaciones mediante operaciones de reverso auditables, nunca borrar silenciosamente ventas finalizadas.
- [ ] Recibos claramente etiquetados como control interno hasta validar requisitos fiscales aplicables.
- **Salida:** pruebas de concurrencia, rollback, idempotencia, cálculos y permisos.

### Fase 6 — Interfaz y operación (P1)

- [ ] Elegir una dirección visual antes de pulir la UI; no asumir que una paleta provisional está aprobada.
- [ ] Completar navegación y flujo de caja, catálogo e inventario para móvil/tablet/escritorio.
- [ ] Temas automático/claro/oscuro con elección manual persistente.
- [ ] Accesibilidad: teclado, foco visible, contraste, etiquetas y mensajes de error.
- [ ] Reportes, cierres de caja, exportación autorizada y auditoría.
- [ ] Definir respaldos/restauración, privacidad, retención y eliminación de datos.
- [ ] Playwright E2E en viewports de escritorio y móvil.
- **Salida:** flujos principales probados de extremo a extremo y documentación operativa.

### Fase 7 — Cumplimiento, preview y lanzamiento (bloqueado hasta aceptación)

- [ ] Confirmar con asesoría competente obligaciones locales aplicables (IVA/IGTF, SENIAT, documentos fiscales y equipos autorizados); no codificar tasas fiscales universales sin revisión.
- [ ] Preparar política de privacidad, términos, contacto real del responsable y transparencia de terceros.
- [ ] Revisar seguridad, recuperación ante fallos, respaldos y límites de planes gratuitos.
- [ ] Solo cuando el usuario acepte y los flujos críticos estén probados, valorar un preview gratuito y aislado.
- [ ] Producción requiere aceptación explícita y no debe activar costes automáticos.
- **Salida:** checklist completo y aprobación del usuario. No declarar certificación legal/fiscal.

## 6. Plan de ciberseguridad 2026 y referencias

Estas referencias son guías de revisión; no implican certificación y no se debe copiar código sin revisar licencia/compatibilidad.

| Prioridad | Recurso | Aplicación prevista |
|---|---|---|
| P0 | [OWASP Cheat Sheet Series](https://github.com/OWASP/CheatSheetSeries) | Sesiones, autenticación, autorización, secretos, validación y logs. |
| P0 | [OWASP ASVS](https://github.com/OWASP/ASVS) | Lista de controles y criterios de aceptación. |
| P0 | [OWASP API Security](https://github.com/OWASP/API-Security) | Pruebas BOLA/IDOR, autenticación, autorización y abuso de recursos. |
| P1 | [GitHub CodeQL](https://github.com/github/codeql) | SAST para JS/TS si permisos y cobertura están disponibles. |
| P1 | [Semgrep](https://github.com/semgrep/semgrep) y [reglas](https://github.com/semgrep/semgrep-rules) | SAST; revisar licencia, cobertura y falsos positivos. |
| P1 | [Trivy](https://github.com/aquasecurity/trivy) | Dependencias, configuración, secretos y SBOM; confirmar cobertura del workflow. |
| P2 | [OWASP ZAP](https://github.com/zaproxy/zaproxy) | DAST en preview/staging aislado, nunca escaneo activo de producción. |
| P2 | [OWASP Juice Shop](https://github.com/juice-shop/juice-shop) | Blanco de entrenamiento aislado; no integrar código vulnerable en Micro app. |
| Condicional | [Apache Casbin Node](https://github.com/apache/casbin-node-casbin) | Revaluar si las políticas de autorización crecen; no instalar sin verificar compatibilidad Workers. |

**Límite importante:** `express-rate-limit` es middleware de Express; no instalarlo directamente en Hono/Workers. El rate limiting debe adaptarse a la plataforma y al modelo distribuido, no depender solo de memoria local.

## 7. Orden inmediato de trabajo

1. Leer este archivo y `docs/HANDOFF_NEXT_CHAT.md`; consultar el SHA actual de `main`, ramas/PRs y Actions.
2. Actualizar el handoff con la punta real del repositorio y el siguiente paso confirmado.
3. Revisar la rama `feat/neon-transaction-adapter` contra `main`; comprobar sus cambios y CI sin fusionarla a ciegas.
4. Confirmar/añadir pruebas de integración de autenticación sobre PostgreSQL efímero y revisar los puntos de seguridad de la Fase 1.
5. Arreglar lockfile/reproducibilidad y seguridad de CI según evidencia real.
6. Seguir por catálogo/inventario, tasa, ventas, devoluciones, UX y E2E, en pequeños cambios con pruebas.
7. Después de cada avance: commit/push, consultar Actions del SHA nuevo, actualizar este plan y anotar lo que realmente pasó.
8. No desplegar producción ni aplicar migraciones a Neon main.

## 8. Prompt para continuar en otro chat

Copia y pega:

> Continúa Micro app leyendo primero `docs/PROJECT_PLAN.md` y `docs/HANDOFF_NEXT_CHAT.md` en https://github.com/BTF14/Micro-app. Verifica el estado real del repositorio, el SHA de main, las ramas/PR y GitHub Actions; no confíes en estados históricos. Trabaja directamente sobre el código existente, realiza cambios seguros, súbelos a GitHub y documenta el resultado en esos dos archivos. Prioriza revisar la rama feat/neon-transaction-adapter contra main y completar/revisar las pruebas de integración de autenticación con PostgreSQL temporal antes de fusionar nada más. No apliques migraciones a Neon main, no conectes otros proyectos, no despliegues producción y mantén el coste total en $0. Nunca expongas secretos ni me pidas repetir conexiones/permisos sin demostrar un bloqueo concreto. Indica commits, pruebas y checks verificados de verdad.


## Checkpoint — herramientas investigadas implementadas en rama de trabajo (2026-10-18)

Rama: `feat/security-e2e-tooling`. Se agregaron una configuración Playwright y dos pruebas de navegador de autenticación con API simulada, un workflow Chromium de CI, un workflow Semgrep JS/TS y el checklist OWASP ASVS y matriz de criterios POS.

**Estado verificado:** en SHA `c0bab00aeaee21a4848d6efd5fcf5c5066a5b582`, CI, validación de migración, Security scan, Semgrep y Playwright E2E terminaron en success: [CI](https://github.com/BTF14/Micro-app/actions/runs/39104699632), [migración](https://github.com/BTF14/Micro-app/actions/runs/39104699591), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/39104699568), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39104699596), [Playwright](https://github.com/BTF14/Micro-app/actions/runs/39104699653). Estos resultados no garantizan producción ni cubren backend real con las pruebas E2E. Playwright se instala de forma temporal en el workflow (`@playwright/test@1.55.0`) para no modificar el lockfile en esta operación; esto es un piloto y deja pendiente incorporarlo correctamente a `apps/web/package.json` y `pnpm-lock.yaml` cuando pueda ejecutarse pnpm 10 y validarse el lockfile. Las pruebas mockean la API y no demuestran que Google OAuth, allowlist, autorización multiempresa o backend estén completos.

No se instala CodeQL (coste/permisos de code scanning privado por confirmar), Casbin ni middleware Express incompatible; ZAP queda para una preview aislada y Juice Shop solo para laboratorio. Mantener presupuesto $0 y no apuntar herramientas dinámicas a producción.
