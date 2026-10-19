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
- Attempted `git clone https://github.com/BTF14/Micro-app.git` followed by `npx --yes autoskills --dry-run` in the available shell, but the shell could not resolve `github.com` (DNS/network unavailable). The CLI dry-run and installation therefore **were not executed**. No external AutoSkills bundle was installed, and no AutoSkills-generated lockfile/hash is claimed.

## Project-local skills added

These are authored for Micro app and stored in `.agents/skills/`; they are not represented as downloaded AutoSkills registry packages.

| Skill | Purpose |
|---|---|
| `micro-app-auth-security` | Endpoint inventory, session/auth review, server-side authorization, tenant isolation, and pending identity-policy guardrails. |
| `micro-app-postgres-testing` | Ephemeral PostgreSQL tests, migrations, transaction rollback, concurrency, idempotency, and cross-tenant negative cases. |
| `micro-app-stack-guidance` | Existing React/Vite + Hono/Workers stack conventions and test/diff quality gates. |
| `micro-app-skill-curation` | Safe preview/install/update procedure for AutoSkills and other SKILL.md sources. |

The skills were independently authored using repository rules and reviewed upstream documentation as references; they do not copy whole third-party skill files. They do not install packages or execute scripts.

## Recommended discovery procedure

From a network-enabled checkout of this repository:

1. Confirm Node.js meets AutoSkills' current engine requirement.
2. Run `npx autoskills --dry-run` and capture its detected stack and proposed skills.
3. Compare each proposed skill against the manifests and current requirements. Select only relevant skills.
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
