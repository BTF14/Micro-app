# ODD task: Mobile barcode scanner — Micro-PR 3B

- Status: in progress
- Issue / PR: Micro-PR 3A merged as PR #399; Micro-PR 3B Draft
- Owner / reviewer: BTF14 / pending review
- Started: 2026-11-21
- Risk: high

## Objective and authorization
- Deliver an accessible on-device barcode viewer, integrate existing QuickProductLookup and validate a real API/PostgreSQL 18 lookup on mobile.
- Exactly eleven authorized files on main SHA `9ffe177f077ecb7bc40f47f03b5269658eb66cc4`; no SQL/migrations, API/backend, packages, workflows, package manifests, dependencies, deployment or gate changes.
- PR #399 MERGED at `841145efb7da16e61e742bf331eda5ad04adb3b6` delivered the SDD, ODD and pure helpers.

## Scope and exclusions
Included: `apps/web/public/_headers`, `apps/web/src/BarcodeScanner.tsx` (new), `apps/web/src/QuickProductLookup.tsx`, `apps/web/src/catalog.css`, `apps/web/src/BarcodeScanner.test.tsx` (new), `apps/web/src/QuickProductLookup.test.tsx`, `apps/web/e2e/real-fullstack-commerce.spec.ts`, this ODD task, `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`.

Excluded: SQL/migrations, `apps/api/**`, `packages/**`, `.github/workflows/**`, `package.json`, new dependencies, frame/video uploads, sales/cart/checkout automation, Neon, secrets, DNS, Cloudflare config and production deployment.

## Acceptance criteria
- [x] AC-1 — main verified identical to exact base before branch creation.
- [x] AC-2 — implementation constrained to eleven paths; final diff verification pending.
- [x] AC-3 — unsupported context/camera/detector and empty format support show Spanish manual fallback without camera request.
- [x] AC-4 — rear-facing camera, playsInline video and guarded detection loop.
- [x] AC-5 — idempotent cleanup on detection, close, Escape, hidden document, camera error and unmount; late stream acquisition stops tracks.
- [x] AC-6 — normalize and validate with `shouldAcceptDetectedBarcode` before one callback.
- [x] AC-7 — Escanear disabled without warehouse; immediate existing `sort=relevance` search; manual typing preserved.
- [x] AC-8 — jsdom lifecycle/fallback/permission tests and lookup integration tests added.
- [x] AC-9 — 390×844 E2E uses browser-only camera simulation and real API/PostgreSQL product lookup; checks USD/VES, stock, track stop, Sales and overflow.
- [ ] AC-10 — all check-runs/workflows pass on exact final PR SHA.
- [ ] AC-11 — PR remains OPEN / Draft, no merge/auto-merge; human review pending.

## Risks and guardrails
| Risk | Severity | Mitigation |
|---|---|---|
| Permission denied/unsupported browser | medium | Friendly manual fallback; no camera request if unsupported. |
| Mobile MediaStream leak | high | Idempotent cleanup and jsdom coverage. |
| Late async camera acquisition | high | Disposed guard; stop tracks immediately when stream resolves late. |
| Repeated barcode reads | medium | Normalize and use `shouldAcceptDetectedBarcode`; close on first accepted result. |
| Frame/video privacy | critical | Frames remain local; only text code reaches existing search API. |
| Accidental sale | critical | Scanner never selects cart items or invokes checkout. |
| Production gates altered | critical | No backend/migration/workflow/deploy/gate changes; production remains NOT READY. |

## Tasks and evidence
| Task | Evidence | Status |
|---|---|---|
| Verify base/conflicts | GitHub compare identical; no open PRs; #398/#399/#400 checked merged | completed |
| Create isolated branch | GitHub branch rooted at exact base | completed |
| Implement viewer and integration | source + jsdom tests; exact-SHA CI pending | completed |
| Add real-stack mobile E2E | PostgreSQL 18 scenario; Playwright CI pending | completed |
| Reconcile docs | ODD and three continuity docs updated | completed |
| Verify diff and checks | only eleven paths and all checks green on exact SHA | pending |

## Technical decisions
- Reuse only the approved pure helpers/types in `apps/web/src/barcode-scanner.ts`.
- Request `facingMode: { ideal: "environment" }`, `audio: false`; intersect reported formats with approved retail formats. Empty intersection is manual fallback.
- Camera frames remain on-device. Only normalized barcode text uses existing QuickProductLookup with `sort=relevance`.
- Suppress the scan-triggered debounce so immediate search is not duplicated; manual typing keeps the existing debounce.
- E2E mocks only browser camera APIs/BarcodeDetector; catalog/inventory API and PostgreSQL 18 remain real, with no API interception.
- Change only `camera=()` to `camera=(self)`; preserve other headers and CSP `connect-src 'self'`.

## Closure and handoff
- PR #399 (3A): MERGED; merge SHA `841145efb7da16e61e742bf331eda5ad04adb3b6`.
- PR #400 (BCV weekend hotfix): MERGED; merge SHA `9ffe177f077ecb7bc40f47f03b5269658eb66cc4`; old Draft wording is superseded.
- Final 3B SHA: pending. PR URL/number: pending creation; keep Draft.
- Checks: pending all check-runs/workflows on final exact SHA. GitHub integration only; no local execution claimed.
- AC-1–AC-9 implemented; AC-10/AC-11 pending exact-SHA checks and PR-state verification.
- Physical camera hardware/browser combinations and OS permission prompts are not certified by simulated CI.
- Next: inspect exact-SHA checks, fix failures only within the eleven authorized files, and keep PR OPEN / Draft without merge/auto-merge.
