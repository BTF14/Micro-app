# ADR — Trust the pinned BCV issuing intermediate only in CI connectivity verification

- **ID:** ADR-20261114-bcv-ci-intermediate-trust
- **Estado:** verified
- **Fecha:** 2026-11-14
- **Responsables:** repository technical maintainers

## Decisión sucesora — runner Node dedicado (2026-11-16)

La decisión CI-only anterior se amplía de forma explícita y limitada: el mismo certificado intermedio público, pineado por SHA-256, puede ser confiado mediante `NODE_EXTRA_CA_CERTS` únicamente dentro del job aislado `.github/workflows/bcv-sync.yml` que ejecuta la ingestión BCV con Node.js 24.22.2. No se extiende la confianza al Worker Cloudflare, a la API, a otros workflows ni a procesos generales del repositorio.

El job valida antes de iniciar Node el fingerprint, subject, issuer, `CA:TRUE`, EKU de servidor TLS y vigencia temporal del certificado. Node conserva la validación normal de cadena, hostname y fechas; queda prohibido `NODE_TLS_REJECT_UNAUTHORIZED=0`, `rejectUnauthorized: false` y cualquier bypass equivalente. `NODE_EXTRA_CA_CERTS` amplía el conjunto de confianza del proceso Node del job y no limita criptográficamente la confianza a un hostname; por ello su exposición se restringe al único paso de sincronización que consulta `https://www.bcv.org.ve/`.

El Worker `micro-app-bcv-sync` conserva sus triggers, pero `BCV_SYNC_ENABLED=false` impide que escriba en `bcv_sync_state`. El productor temporal es el runner Node, con `DATABASE_URL_BCV_SYNC` aislado y rol PostgreSQL `microapp_bcv_sync`. El preflight solo lee las columnas autorizadas por migración 0022: `singleton,last_outcome` y `id,validation_status`; el identificador real de fuente es `BCV_OFFICIAL_HTML_V1` (no el alias genérico `bcv`). Si estado y tasa válida de hoy están confirmados, omite la ejecución sin tocar el estado, salvo `force_sync=true`.

La CI usa PostgreSQL 18 y un adaptador `pg` inyectado para validar el contrato; eso no demuestra el transporte WebSocket del cliente Neon. La primera ejecución real `workflow_dispatch` desde `main`, posterior al merge y a la verificación del secreto por el propietario, es el gate explícito para demostrar `@neondatabase/serverless` sobre Node 24.22.2. No se consultan ni modifican Neon `main`, Secrets ni Cloudflare desde esta PR.

**Estado de producto:** `PRODUCTION: NOT READY`; Issue #53 permanece `OPEN/P0`. La Fase 2 — cierre de AC-6 legal/contable y AC-7 seguridad, seguida de Contingencia Manual BCV como Prioridad #1 — comienza inmediatamente después de verificar la primera tasa real persistida en Neon `main`.
- **Relacionado:** ODD task `odd/tasks/bcv-weekday-cron-and-ci-tls-chain.md`; PR pending

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
