# Runtime security advisory triage — 2026-10-22

Status: initial triage; not a certification that every deployed environment is patched.

## Evidence checked

- Repository manifests identify a pnpm TypeScript monorepo: React/Vite frontend and Hono API for Cloudflare Workers. The API depends on `hono` and `@neondatabase/serverless`; Wrangler and Workers types are development dependencies.
- CI uses `actions/setup-node` with `node-version: 22`, and installs from the committed `pnpm-lock.yaml`.
- The lockfile includes platform-specific `workerd` packages and Node-based development/build tools. This does **not** mean the production Workers isolate is a traditional Node.js server.
- The official Node.js Project published security releases on 2026-10-21 for Node.js 22.x, 24.x and 26.x, including high-severity TLS hostname-validation issues and a Brotli decoder issue. Node.js 22.23.4 is listed as the patched 22.x release. Source: https://nodejs.org/en/blog/vulnerability/october-2026-security-releases

## Decisions

1. Treat the Node.js advisory as relevant to developer machines, CI jobs, build tooling, and any Node.js-based auxiliary hosting/runtime that actually executes this application. Keep CI on the supported Node 22 line, whose `setup-node@v4` configuration resolves the current 22.x patch at job runtime; verify the actual resolved version in CI before claiming the patch is present.
2. Do not classify the Cloudflare Workers production runtime as Node.js solely because the repository uses Node for package installation and builds. Review Cloudflare runtime advisories separately.
3. No Java, Go, or Python application manifests/runtime images were identified in the inspected root/API package manifests. This is limited evidence, not a repository-wide proof that these runtimes are absent from every workflow, image, external service, or deployment.
4. Do not rotate certificates, credentials, or secrets based solely on the social post. Identify the affected trust store/runtime and the relevant official advisory first.
5. Enable automated dependency update PRs for the pnpm workspace and GitHub Actions. Updates must pass the existing CI/security checks; do not auto-merge dependency or runtime changes.
6. Keep production deployment disabled for this triage. Do not change Neon main, auth policy, or production secrets.

## Follow-up verification required

- Review all workflow files and deployment configuration for Node, Java, Go, Python, containers, and pinned runtime versions.
- Confirm the Node version actually used by CI/build/auxiliary deployments and update any pinned affected runtime to the official patched release.
- Review the latest Trivy, Semgrep, and dependency audit outputs for findings tied to exact package versions; the prior green scan is not proof against advisories published later.
- Check Cloudflare Workers/Pages and Vercel runtime settings independently; Vercel is auxiliary, not the canonical API runtime.
- Record exact commit SHA, workflow run, tool output, and fixed package/runtime version before closing any finding.

## Source limitations

The social-media image is an alert summary, not sufficient evidence to identify CVEs, affected version ranges, deployed runtimes, or certificate issuers for Java, Go, and Python. Those claims remain unverified until mapped to official vendor advisories and the actual deployment inventory.
