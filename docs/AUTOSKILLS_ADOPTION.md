# AutoSkills and project agent skills

Updated: 2026-10-19. Re-check upstream sources before installing or updating anything.

## Goal

Use the open `SKILL.md` convention to make future work repeatable across chats and compatible coding agents. Prefer the curated AutoSkills registry when network access is available, but install only skills that match Micro app's real stack.

## Verified project stack

The current package manifests on `main` identify:

- pnpm workspace with `apps/*`
- Frontend: React, React DOM, Vite, TypeScript, Vitest
- API: Hono, TypeScript, Wrangler / Cloudflare Workers
- Database access: `@neondatabase/serverless`
- Existing CI workflows include security scanning, Semgrep, migration validation, and Playwright E2E; verify exact workflow coverage and SHA before relying on a result.

This is not a Next.js or Supabase project. The project does not currently declare Next.js, Supabase, Astro, Tailwind, React Hook Form, or Zod in the package manifests reviewed. Do not install skills for absent technologies just because a generic detector suggests them. Recheck manifests when the stack changes.

## AutoSkills evaluation

- Project: https://www.autoskills.sh/
- Upstream repository: https://github.com/midudev/autoskills
- Package README / supported technology detection: https://github.com/midudev/autoskills/blob/main/packages/autoskills/README.md
- AutoSkills describes local stack detection, a curated skill registry, SHA-256 integrity checks, and a generated `skills-lock.json`. Its registry is preferable to arbitrary unreviewed skill downloads.
- The upstream project declares CC BY-NC 4.0 for AutoSkills itself. Review the license of each skill separately before redistributing skill content.
- Read-only source inspection was performed through GitHub's repository connector. Useful registry entries include React performance guidance, TypeScript advanced types, Vite, and Hono. Version-sensitive content must be checked against the versions actually used here; in particular, do not blindly apply Vite 8 guidance to the current Vite 7 dependency.
- The available local shell still cannot resolve `github.com`, and `npm view autoskills` timed out. This is a local DNS/network limitation, not a Node/npm version problem.

## Real CLI dry-run — verified 2026-10-19

The official CLI was successfully executed in GitHub Actions, which has working network access:

- Command: `npx --yes autoskills@0.4.1 --dry-run --verbose`
- Runner: GitHub-hosted Ubuntu 24.04, Node.js 22.23.3, npm 10.9.9
- Workflow run: https://github.com/BTF14/Micro-app/actions/runs/39300536264
- Run ID: `39300536264`; job ID: `118224260673`
- Exact head commit tested: `09f17020f7543439ed822726419de9777d34fa08`
- Result: **success**. The CLI detected TypeScript, Node.js, Neon Postgres, Cloudflare, Hono, Vitest, React, Playwright, and Vite, plus the Cloudflare + Vite combination.
- AutoSkills proposed 19 candidates. The list included relevant candidates such as `typescript-advanced-types`, `neon-postgres`, `cloudflare`, `wrangler`, `workers-best-practices`, `hono`, `vitest`, `react-best-practices`, `playwright-best-practices`, and `vite`.
- The proposal also included items that must **not** be installed blindly, notably `migrate-to-vinext` (Micro app is not adopting Vinext) and `cloudflare-deploy` (deployment guidance is not an approval to deploy). Other candidates may overlap existing project skills or need separate review.
- The CLI explicitly reported `--dry-run: nothing was installed.` This is verified preview evidence, **not** an installation. No external AutoSkills bundle was installed, and no AutoSkills-generated `skills-lock.json` or bundle hash is claimed.

A reusable, read-only workflow was added at `.github/workflows/autoskills-preview.yml` in PR #66. It runs the pinned CLI version in dry-run mode only, with `contents: read`, no secrets, no database access, and no deployment.

## Project-local skills added

These are authored for Micro app and stored in `.agents/skills/`; they are not represented as downloaded AutoSkills registry packages.

| Skill | Purpose |
|---|---|
| `micro-app-auth-security` | Endpoint inventory, session/auth review, server-side authorization, tenant isolation, and pending identity-policy guardrails. |
| `micro-app-postgres-testing` | Ephemeral PostgreSQL tests, migrations, transaction rollback, concurrency, idempotency, and cross-tenant negative cases. |
| `micro-app-stack-guidance` | Existing React/Vite + Hono/Workers stack conventions and test/diff quality gates. |
| `micro-app-skill-curation` | Safe preview/install/update procedure for AutoSkills and other SKILL.md sources. |

The skills were independently authored using repository rules and reviewed upstream documentation as references; they do not copy whole third-party skill files. They do not install packages or execute scripts.

## Recommended discovery and installation procedure

From a network-enabled checkout of this repository:

1. Confirm Node.js meets AutoSkills' current engine requirement.
2. Run `npx autoskills --dry-run` and capture its detected stack and proposed skills.
3. Compare each proposed skill against the manifests and current requirements. Select only relevant skills; reject migration/deployment guidance unless separately approved.
4. Inspect the curated registry entry, source/license, security review, bundle hash, and all companion files.
5. Install interactively without `-y`; review the complete diff and generated lockfile.
6. Run available skill format/lint/security checks, then verify repository CI on the exact commit.
7. Record the actual command, result, registry hash, and any limitations here and in `docs/RESOURCE_REGISTRY.md`.

Do not create a fabricated lockfile, claim a successful install without command output, execute bundled scripts as an install side effect, or enable paid tools. Keep all operations at $0.

## Further skill sources researched

- Secure code review: https://www.skills.sh/unitoneai/securityskills/secure-code-review
- Authentication review: https://www.skills.sh/descope/skills/auth-review
- PostgreSQL development: https://www.skills.sh/ingpoc/skills/postgresql-skill
- Database testing: https://www.skills.sh/petrkindlmann/qa-skills/database-testing
- AutoSkills registry entries: https://github.com/midudev/autoskills/tree/main/packages/autoskills/skills-registry

These are research leads, not claims that those third-party skills were installed. Prefer a registry-verified package over manual download; adapt only the relevant procedures to this repository and check license, security, and version compatibility first.


## Curated installation after individual review — 2026-10-19

The 19 proposals were reviewed individually in [AUTOSKILLS_REVIEW_2026-10-19.md](AUTOSKILLS_REVIEW_2026-10-19.md), with structured decisions and hashes in [skill-install-log.json](../skill-install-log.json). Only two external skills were copied into the current review branch: `accessibility` (MIT) and `typescript-advanced-types` (MIT). Their complete referenced Markdown files and upstream LICENSE files are included; project-specific safety/version overlays are documented in the log. No runtime dependencies, scripts, secrets, database access, or deployments were added/executed.

The AutoSkills CLI package itself declares CC-BY-NC-4.0. It was not used as the installer for this commercial-oriented project. The successful run 39300536264 remains a dry-run only. The official `skills-lock.json` is intentionally absent: `skill-install-log.json` is a custom project audit record, not a replacement claim. The AutoSkills registry manifest could not be read through the available connector, so its official bundle hashes/security-review fields remain unverified; installed files are instead pinned to GitHub blob IDs and checked by `scripts/validate-skill-install-log.mjs` and the new `skill-integrity.yml` workflow.
