# API runtime target: Cloudflare Workers

## Decision

The canonical runtime for `apps/api` is **Cloudflare Workers**, not Vercel Node.js Functions. This is already recorded in `docs/ARCHITECTURE_AND_ZERO_COST.md` and `.agents/skills/micro-app-stack-guidance/SKILL.md`.

Evidence in the repository:
- `apps/api/wrangler.toml` declares `main = "src/index.ts"` and `name = "micro-app-api"`.
- The entry point exports a Hono app as a Workers module (`export default app`) and accesses provider bindings through `c.env`.
- `apps/api/package.json` is ESM, but `apps/api/tsconfig.json` uses `moduleResolution: "Bundler"` and `noEmit: true`; it is a typecheck configuration, not a Node.js output build.
- The root `build` script builds the Vite web app and typechecks the API. It does not emit a runnable Node.js API bundle.
- The documented hosting design is React/Vite on Cloudflare Pages, Hono API on Cloudflare Workers, and PostgreSQL on the dedicated Neon project.

## Root cause of the Vercel startup failure

The observed Vercel runtime reports `ERR_MODULE_NOT_FOUND` for `/var/task/apps/api/src/auth` imported by `index.js`. A successful Vercel build did not prove the API entrypoint was executable. The deployment is treating TypeScript/Workers-oriented source as a Node.js ESM runtime artifact; extensionless relative imports such as `./auth` are not resolved by Node ESM in the same way as the bundler/Workers toolchain. A one-off import-extension patch would only address the first symptom and leave the runtime contract (Workers bindings and build output) mismatched.

## Corrective action and safety boundary

- Do not adapt the production API to Vercel or change Vercel project settings/aliases/environment variables as part of this fix.
- Build and validate the API with Wrangler for Cloudflare Workers. A future release must be a **preview/non-production** deployment first, with `/health` smoke-tested and required non-secret bindings configured in that environment.
- Keep Vercel API project `micro-app-7lg5` non-canonical until it can be safely retired or relinked by an explicitly reviewed infrastructure change. This branch does not alter Vercel settings, domains, production aliases, secrets, or deployment state.
- Do not run production deploys, migrations, or mutations against Neon `main`.

## GitHub Actions diagnosis

For PR #71's current head at the time of review, `f0f489fc6ac2f5ada84105610ae3eb0e1ff286e2`, the check-runs endpoint returned 9 checks: Cloudflare Pages and Vercel Preview Comments succeeded; 7 checks failed. The seventh displayed failure is a **duplicate Trivy filesystem/configuration check-run** (two Security scan jobs), in addition to the six unique failed workflow jobs. The jobs examined completed in about two seconds with `runner_id: 0`, an empty `runner_name`, and `steps: []`. This is evidence of runner/job initialization failure before workflow steps, not evidence that application tests or security scans ran and found defects. The root cause of runner assignment is still unknown. Do not rerun repeatedly without new runner evidence.

## Verification status

GitHub source/configuration was inspected remotely. No local checkout/runtime is available through the current GitHub connector workflow, so a Wrangler dry-run and real `/health` smoke test have **not** been executed in this change. Required next verification is `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm test`, `pnpm --filter @micro-app/api exec wrangler deploy --dry-run` from a checkout, then a non-production Workers preview smoke test. Report each result separately; do not infer success from the existing Vercel build status.
