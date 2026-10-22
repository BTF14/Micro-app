# Runtime security advisory triage — 2026-10-22

Status: initial triage; not a certification that every deployed environment is patched.

## Evidence checked

- Repository manifests identify a pnpm TypeScript monorepo: React/Vite frontend and Hono API for Cloudflare Workers. The API depends on `hono` and `@neondatabase/serverless`; Wrangler and Workers types are development dependencies.
- CI and Playwright E2E now pin `actions/setup-node` to Node.js `22.23.4` and explicitly assert the patched 22.x minimum. Both workflows install from the committed `pnpm-lock.yaml`.
- The lockfile includes platform-specific local `workerd` packages (currently `1.20261012.1`) and Node-based development/build tools. Local `workerd` used by Wrangler/Miniflare is a separate review item from Cloudflare's hosted Workers runtime. This does **not** mean the production Workers isolate is a traditional Node.js server.
- The official Node.js Project published security releases on 2026-10-21 for Node.js 22.x, 24.x and 26.x, including high-severity TLS hostname-validation issues and a Brotli decoder issue. Node.js 22.23.4 is listed as the patched 22.x release. Source: https://nodejs.org/en/blog/vulnerability/october-2026-security-releases

## Decisions

1. Treat the Node.js advisory as relevant to developer machines, CI jobs, build tooling, and any Node.js-based auxiliary hosting/runtime that actually executes this application. CI and Playwright E2E explicitly pin Node.js 22.23.4 and fail if the runtime is below that patch. The pin covers those workflows only, not developers' machines or external build providers.
2. Do not classify the Cloudflare Workers production runtime as Node.js solely because the repository uses Node for package installation and builds. Review Cloudflare runtime advisories separately.
3. No Java, Go, or Python application manifests/runtime images were identified in the inspected root/API package manifests. This is limited evidence, not a repository-wide proof that these runtimes are absent from every workflow, image, external service, or deployment.
4. Do not rotate certificates, credentials, or secrets based solely on the social post. Identify the affected trust store/runtime and the relevant official advisory first.
5. Enable automated dependency update PRs for the pnpm workspace and GitHub Actions. Updates must pass the existing CI/security checks; do not auto-merge dependency or runtime changes.
6. Keep production deployment disabled for this triage. Do not change Neon main, auth policy, or production secrets.

## Follow-up verification required

- Review all workflow files and deployment configuration for Node, Java, Go, Python, containers, and pinned runtime versions. The E2E workflow uses the Playwright `v1.55.0-noble` container; its OS/runtime inventory is separate from the Node binary installed by `setup-node`.
- Confirm the Node version actually used by CI/build/auxiliary deployments and update any pinned affected runtime to the official patched release.
- Review the latest Trivy, Semgrep, and dependency audit outputs for findings tied to exact package versions; the prior green scan is not proof against advisories published later.
- Check Cloudflare Workers/Pages and Vercel runtime settings independently; Vercel is auxiliary, not the canonical API runtime. The Worker config uses `compatibility_date = 2026-10-17`; this is a compatibility behavior setting, not a Node.js patch-version pin. Cloudflare documents that hosted Workers runtime updates roll out separately from compatibility-date flags.
- Record exact commit SHA, workflow run, tool output, and fixed package/runtime version before closing any finding.

## Source limitations

The social-media image is an alert summary, not sufficient evidence to identify CVEs, affected version ranges, deployed runtimes, or certificate issuers for Java, Go, and Python. Those claims remain unverified until mapped to official vendor advisories and the actual deployment inventory.

## Follow-up findings from repository inspection

- The initial audit found `node-version: 22` in both `ci.yml` and `playwright-e2e.yml`. Both have now been pinned to `22.23.4` with a minimum-version assertion; the PR head must pass CI again before this change is considered verified.
- `migration-check.yml` runs SQL in a disposable PostgreSQL service and does not install Node.js, so no Node pin was added there.
- `apps/api/wrangler.toml` targets hosted Cloudflare Workers. Do not blindly change its compatibility date as a patch response; that date changes runtime compatibility behavior and should be tested as a separate change.
- The lockfile resolves local `workerd`/Miniflare to `1.20261012.1` for development/testing. No official advisory tying that exact version to the social post was verified in this triage. Keep it on the dependency-update review list and do not claim the hosted Workers runtime is vulnerable or patched based on this local package version alone.

## Dependency-specific advisory cross-check (2026-10-22)

- The lockfile resolves `hono` to `4.13.13`. Hono's official advisory for `serveStatic` double-decoding (CVE-2026-111757, GHSA-5r4p-p66f-jhc7) marks versions `>=4.12.4, <4.13.11` as affected and `4.13.11` as patched. The resolved version is newer than the patched floor. The inspected API entrypoint imports `Hono` and `cors`, and its auth routes use `c.req.json()`; no `serveStatic` or `parseBody({ dot: true })` usage was found in the inspected API source. This is a version-and-usage triage, not a substitute for a full dependency audit.
- Hono's `parseBody()` unbounded dot-notation nesting advisory (GHSA-g6gw-c38x-mqfc) affects versions below `4.13.5`; the resolved `4.13.13` is above that patched floor.
- Official references: https://github.com/honojs/hono/security/advisories/GHSA-5r4p-p66f-jhc7 and https://github.com/honojs/hono/security/advisories/GHSA-g6gw-c38x-mqfc.
- A further scan of all tracked workflows found `.github/workflows/autoskills-preview.yml` also selected generic Node `22` before running `npx autoskills@0.4.1`. That workflow has now been pinned to `22.23.4` with the same runtime assertion. The remaining tracked workflows either do not install/use Node.js directly or use Python/Docker-based tools.
- The Node.js 22.23.4 CI pins are mitigations for CI/build jobs only. They do not patch a developer workstation or change Cloudflare's hosted runtime, and they do not guarantee that an external provider's build image uses the same Node version.
