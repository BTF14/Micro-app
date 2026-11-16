# ADR — Trust the pinned BCV issuing intermediate only in CI connectivity verification

- **ID:** ADR-20261114-bcv-ci-intermediate-trust
- **Estado:** verified
- **Fecha:** 2026-11-14
- **Responsables:** repository technical maintainers

## Decisión sucesora — runner Node dedicado (2026-11-16)

**Estado de implementación:** merged and production transport verified.

La decisión CI-only anterior se amplió de forma explícita y limitada: el certificado intermedio público Sectigo DV R36, pineado por SHA-256, se confía mediante `NODE_EXTRA_CA_CERTS` únicamente dentro del job aislado `.github/workflows/bcv-sync.yml` que ejecuta la ingestión BCV con Node.js 24.22.2. El job valida fingerprint, subject, issuer, `CA:TRUE`, EKU de servidor TLS y vigencia antes de iniciar Node. Node conserva la validación normal de cadena, hostname y fechas; siguen prohibidos `NODE_TLS_REJECT_UNAUTHORIZED=0`, `rejectUnauthorized: false` y cualquier bypass equivalente.

El Worker `micro-app-bcv-sync` conserva sus triggers, pero `BCV_SYNC_ENABLED=false` impide que escriba. El check-run post-merge [Workers Builds: micro-app-bcv-sync](https://github.com/BTF14/Micro-app/runs/133682202852) terminó `completed / success` en el merge SHA `98e249778a52e9306a193e838edea4503e0343e6`.

El preflight usa exclusivamente las columnas autorizadas por migración 0022 y el identificador de fuente `BCV_OFFICIAL_HTML_V1`. La CI usa PostgreSQL 18 con adaptador `pg`; adicionalmente, la primera ejecución productiva real validó Node 24.22.2 y `@neondatabase/serverless` contra el entorno Neon mediante `workflow_dispatch`, `force_sync=false`.

**Evidencia de producción:** [BCV Node TLS sync #1](https://github.com/BTF14/Micro-app/actions/runs/43977544849), run #1, main SHA `98e249778a52e9306a193e838edea4503e0343e6`, completed / success. El job validó el certificado y ejecutó el runner; su salida registró `BCV_NODE_SYNC_COMPLETED`, `outcome: 'inserted'`. La observación API/panel del propietario a las 23:17:15Z informó una tasa `BCV_OFFICIAL_HTML_V1` con `effectiveDate: 2026-11-17`, estado `scheduled`, y `fetchedAt: 2026-11-16T23:14:50.014Z`. La ruta latest devolvió `503 BCV_RATE_UNAVAILABLE` antes de la vigencia local de medianoche VET; esto es el fail-closed esperado. La observación API/panel se atribuye expresamente al propietario, no a la respuesta de GitHub.

**Validación post-merge:** GitHub reporta 16 check-runs (no 15), todos `completed / success`, todos sobre `98e249778a52e9306a193e838edea4503e0343e6`; incluye `Workers Builds: micro-app-bcv-sync`, `generate-progress` y `validate-odd-docs`.

**Estado de producto:** `PRODUCTION: NOT READY`; Issue #53 permanece `OPEN/P0`; freeze comercial vigente. La Fase 1 de implementación y transporte queda cerrada. La estabilidad posterior sigue abierta hasta observar la transición a `current` el 2026-11-17 desde 00:00 VET, la próxima corrida automática de Node en `main` y la inactividad inocua continuada del Worker pausado.

**Fase 2:** iniciar el cierre de AC-6 legal/contable y AC-7 seguridad para Contingencia Manual BCV como Prioridad #1, según `ADR-20261114-v11-product-scope-and-roadmap.md`. Esto no levanta el freeze ni el estado NOT READY.
- **Relacionado:** [PR #374](https://github.com/BTF14/Micro-app/pull/374); ODD task `odd/tasks/bcv-node-tls-producer-migration-20261116.md`.

## Contexto y problema

The manual BCV connectivity test runs under Node.js and correctly fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` because the BCV HTTPS endpoint omits the intermediate certificate in its TLS chain. Certificate Transparency records for the active `*.bcv.org.ve` certificate identify its issuer as Sectigo Public Server Authentication CA DV R36. Sectigo identifies that intermediate as issued by Sectigo Public Server Authentication Root R46. The issue is a server-supplied chain omission, not a reason to disable TLS verification.

## Decisión

Add the exact public Sectigo Public Server Authentication CA DV R36 certificate to the repository as a pinned PEM trust certificate for the PR-triggered/manual CI connectivity check only. Before Node starts, the workflow must verify:
- SHA-256 certificate fingerprint: `8C54C334B66BA4E426772AF4A3F9136C19A1AEC729FDB28C535C07A5A4EF22E0`;
- subject: `CN=Sectigo Public Server Authentication CA DV R36,O=Sectigo Limited,C=GB`;
- issuer: `CN=Sectigo Public Server Authentication Root R46,O=Sectigo Limited,C=GB`;
- certificate validity at execution time.

Set `NODE_EXTRA_CA_CERTS` only on the manual Vitest step. Node's default trusted CA set is extended, not replaced; normal certificate-chain, hostname and validity checks remain enabled. Do not use this certificate in the production Worker, application runtime or general CI jobs.

## Alternatives considered

- Disable certificate verification: rejected; it destroys TLS authenticity and is explicitly prohibited.
- Set `NODE_TLS_REJECT_UNAUTHORIZED=0` or `rejectUnauthorized: false`: rejected for the same reason.
- Trust the Sectigo R46 root as an additional certificate: insufficient by itself because the server omits the intermediate needed to link the leaf to the root.
- Download a CA dynamically without pinning: rejected because it creates a mutable trust input and weakens reviewability.
- Ask BCV to fix its server chain: desirable upstream correction, but not an actionable repository-side fix or CI verification in this task.

## Consequences and risks

- The manual connectivity test can build a trust path when the server omits the known intermediate.
- The trust is deliberately narrow in scope and anchored to a public intermediate whose fingerprint is reviewed in source control.
- Certificate rotation, revocation, or issuer change causes the pin/identity checks to fail closed; maintainers must inspect the new official chain before updating the certificate.
- This does not repair BCV's server configuration and does not prove production Worker runtime behavior.
- The first real BCV rate persisted to Neon `main` remains a separate production gate.

## Reversión o sustitución

Remove the CI-only `NODE_EXTRA_CA_CERTS` setting and pinned certificate file to restore the previous fail-closed connectivity test. If BCV begins serving a complete chain, remove the supplemental trust after the manual test passes using the system trust store alone. If the issuer changes, replace the pin only after validating the new chain against the CA's official source and updating this ADR.

## Evidencia

- Repository/base at decision time: `BTF14/Micro-app`, main `a0907a92e98647779d50d683efa8156eba21f529`.
- Certificate Transparency: `crt.sh/?q=bcv.org.ve` (wildcard certificate issued by Sectigo DV R36).
- Exact intermediate record: `crt.sh/?id=4267304690`.
- Official Sectigo hierarchy: `https://www.sectigo.com/knowledge-base/detail/Sectigo-new-Public-Roots-and-Issuing-CAs-Hierarchy/kA0Uj0000004IrB`.
- Node.js CA extension behavior: `https://nodejs.org/api/cli.html#node_extra_ca_certsfile`.
- Existing failing manual workflow: Run `43622117742`, error `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.
- Implementation and tests: PR [#361](https://github.com/BTF14/Micro-app/pull/361), exact HEAD `d0e0ddf522c07bdf2e7bf0054cf7be079e3f2c90`; 17/17 check-runs and 14/14 workflow runs SUCCESS. The strict-TLS BCV connectivity test passed on both push and pull_request events, with the live production parser accepting the returned HTML.

## Historial

- 2026-11-14 — accepted and verified a pinned, CI-only trust anchor for the PR-triggered/manual BCV connectivity test; no production trust-store change authorized.
