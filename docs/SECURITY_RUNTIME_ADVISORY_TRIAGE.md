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


## Vercel live configuration inspection — 2026-10-22

Read-only inspection through the connected Vercel account found two separate Hobby projects linked to the same GitHub repository, `BTF14/Micro-app`:

- `micro-app-7lg5` is configured with framework `hono` and project Node version `24.x`.
- `micro-app` is configured with framework `vite` and project Node version `24.x`.
- Both latest deployments observed for branch `security/oct-2026-runtime-advisories`, commit `31faca4ce84219dea4e935a9923fe14d340009ca`, were `READY` with `target: null` and preview branch aliases. These are preview deployments, not evidence of a production deployment.
- The project metadata reports `live: false` for both projects at inspection time. Do not infer from that field alone that no production traffic exists elsewhere.
- The projects have different frameworks and overlapping repository linkage. This may be intentional (API preview vs frontend preview), but the repository alone does not prove their root directories, build commands, output directories, or production-domain ownership. Do not delete or relink either project without establishing intended ownership and deployment topology.

### Implications and remaining checks

1. The Vercel project setting `24.x` specifies a major line, not the exact patch release. The official Node.js release for 2026-10-21 lists Node.js `24.22.1` as the patched 24.x release; the project setting alone does not prove that exact patched runtime is used by every build or function. Source: https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
2. The Node.js `22.23.4` pins in GitHub Actions do not override Vercel's project Node.js setting. Keep these controls separate.
3. No project settings were changed, no environment-variable values were retrieved or displayed, and no deployment was initiated. Production status, actual function runtime patch level, root/build settings, and custom-domain routing still require read-only verification in Vercel/Cloudflare dashboards.
4. Canonical production architecture remains Cloudflare Pages + Cloudflare Workers/Hono + Neon. Treat both Vercel projects as auxiliary until their purpose is confirmed; do not migrate canonical API traffic to Vercel based on this inspection.


## Vercel production-target deployment cross-check — 2026-10-22

A second read-only inspection of the two Vercel projects' deployment lists found successful deployments with `target: production` on `main`, in addition to the PR previews:

- Project `micro-app-7lg5` (framework `hono`): deployment `dpl_AvNPxNL3zQ37jYZYP5mQots19grs`, state `READY`, target `production`, source commit `d2fa1407fca9a0c13c8c9dc9b3bed60b53a3d0be`. Assigned aliases include `micro-app-7lg5.vercel.app` and `micro-app-7lg5-git-main-devbtf.vercel.app`.
- Project `micro-app` (framework `vite`): deployment `dpl_3wvixKjcsV3yYYPemPRqPgGAVTwU`, state `READY`, target `production`, source commit `d2fa1407fca9a0c13c8c9dc9b3bed60b53a3d0be`. Assigned aliases include `micro-app-five.vercel.app` and `micro-app-git-main-devbtf.vercel.app`.

This is stronger evidence than the earlier preview-only observation: both projects have a production-target deployment recorded by Vercel. It does not, by itself, prove actual request volume, that both are part of the intended production topology, or which domain is the canonical public entry point. The project metadata still reports Node `24.x`, not an exact patch version. Project root directories, build commands/output settings, environment-variable names/targets (without reading values), and the intended ownership of public domains remain unverified.

### Required disposition

1. Do not delete, pause, relink, or change either project/domain as part of this advisory triage; that could disrupt a live site.
2. Confirm the intended canonical public URL and whether the Hono Vercel deployment is an intentional auxiliary service, a legacy deployment, or a production API. Reconcile this with the documented Cloudflare Pages + Workers/Hono + Neon architecture before changing routing.
3. Inspect build configuration and exact effective Node patch levels read-only. The `24.x` setting alone is not proof that builds/functions use the official patched Node 24 release.
4. Keep this PR draft until the topology/runtime questions are answered. No deployment was initiated and no Vercel/Cloudflare project settings, environment-variable values, or Neon data were changed/read for this cross-check.


## Production build-log cross-check — 2026-10-22

Read-only build-event inspection of the two `main` deployments above adds these concrete details:

- Both build logs identify the repository root as the build entrypoint (`.`) and run `vercel build`; both install the workspace from the root `pnpm-lock.yaml` and use pnpm 10.28.0 in the recorded build.
- The Vite project log explicitly runs `pnpm run build` for package `@micro-app/web` in `/vercel/path0/apps/web`; Vite emits the `dist/` bundle. This aligns with the repo's `apps/web/package.json` build script (`tsc -b && vite build`).
- The Hono project log confirms the Hono framework project and a root-level Vercel build, but the retrieved build-event excerpt does not show an explicit app/API build command or establish which API entrypoint is emitted. Do not assume it is equivalent to the canonical Cloudflare Worker build merely from the framework label.
- Neither log exposed a trustworthy exact Node patch version. The project setting remains `24.x`; exact build/runtime patch remains unverified.
- Both logs include pnpm's warning that install scripts for `esbuild@0.28.2` and `workerd@1.20261012.1` were ignored. This is a reproducibility/build-behavior item to assess, not evidence by itself that the hosted Cloudflare Workers runtime is vulnerable or that the deployment failed.
- Read-only Vercel environment listing returned no visible variables for either project and `hiddenProductionEnvCount: 0`; no variable values were requested. This should not be treated as proof that application runtime needs no secrets, because bindings may be supplied elsewhere or platform configuration can differ.

Disposition: do not change project roots/build settings or approve a Vercel API migration based only on these logs. Confirm the intended Hono project behavior, effective Node version and API binding/routing against the canonical Cloudflare deployment first.
