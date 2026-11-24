---
name: micro-app-stack-guidance
description: Make maintainable, tested changes that fit Micro app's existing React/Vite frontend, TypeScript workspace, Hono API, Cloudflare Workers, and Neon serverless driver. Use for implementation, refactoring, build, or dependency decisions.
---

# Micro app stack guidance

## Confirm the actual stack

- Read root and app-level `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, the relevant config, and existing callers before choosing a library or pattern.
- Current package manifests show a pnpm workspace with React/React DOM, Vite, TypeScript, Vitest, Hono, Wrangler, and `@neondatabase/serverless`. Re-verify before relying on this list.
- This is not a Next.js or Supabase application. Do not apply framework-specific patterns for absent frameworks or add dependencies without a concrete need.
- Keep existing architecture and versions unless a measured defect or requirement justifies a change.

## Frontend: React + Vite

### Frontend design and UX standard

- Before designing or implementing UI, read `docs/FRONTEND_DESIGN_STANDARD.md`; it is the project's shared UI/UX standard.
- Apply its responsive, accessibility, loading/empty/error/success, interaction-state and POS/inventory guidance.
- Inspect and reuse existing CSS variables and visual patterns before adding tokens. Do not introduce Tailwind, a component library, router, SSR or a new styling system without a concrete requirement and review.
- The standard is adopted for new work and touched screens; it does not authorize a broad visual rewrite of existing screens.


- Preserve the SPA architecture and current Vite build configuration; do not introduce SSR, a router, UI framework, form library, or CSS system without a requirement.
- Use semantic HTML, accessible labels, visible focus, keyboard navigation, and clear loading/empty/error states.
- Keep components cohesive and state ownership explicit. Avoid premature memoization; optimize only with evidence.
- Treat client validation as UX only. The API must validate and authorize every protected operation.
- Add focused Vitest tests for user-visible behavior and important edge cases.

## API: TypeScript + Hono + Workers

- Follow existing Hono routing/middleware and Web API runtime constraints.
- Validate untrusted input at the API boundary. Keep errors safe and useful without disclosing credentials, session tokens, SQL, or private data.
- Do not import Node-only APIs or Express middleware into Workers code without verified compatibility.
- Keep business authorization on the server, close to the operation, and test negative paths.
- Avoid unnecessary packages; inspect lockfile and workspace scripts before modifying dependencies.

## Quality gate

1. State the smallest change that satisfies the requirement.
2. Inspect related callers and tests.
3. Implement the change without expanding scope.
4. Run relevant unit/integration tests, typecheck, and build as available.
5. Review the full diff for security, accessibility, regressions, and dependency/lockfile consistency.
6. Verify required GitHub Actions on the exact final SHA.
7. Update the handoff, plan, journal, and resource registry when the change affects continuity or tooling.

Never claim commands or checks ran unless there is direct evidence. Never deploy production, spend money, reveal secrets, or mutate Neon `main` outside the documented approval gates.
