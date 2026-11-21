# ODD task: Mobile barcode scanner (PR 3A — SDD, ODD and pure helpers)

- Status: in progress
- Issue / PR: PR 3A; PR number assigned when opened
- Owner / reviewer: BTF14 / pending review
- Started: 2026-11-20
- Risk: medium

## Objective and authorization

- Desired outcome: define the mobile barcode scanner contract and deliver deterministic, side-effect-free TypeScript helpers plus Vitest coverage, ready for separate UI integration in 3B.
- Authorization boundary: exactly four new files on a branch based on main SHA `04a6c325f87d0a854ffccc0a962704c7cf11b878`. No existing file edits, SQL, API/backend, workflows, dependency changes, deployment, merge or auto-merge.
- Relevant original request: Micro-PR 3A — SDD, ODD and pure helpers for the Mobile Barcode Scanner; binding product scope in `docs/decisions/ADR-20261114-v11-product-scope-and-roadmap.md`.

## Scope and exclusions

Included:
- SDD for 3A/3B, native BarcodeDetector + getUserMedia, on-device processing, manual fallback, cleanup and deduplication.
- This ODD task, following `odd/TASK_TEMPLATE.md`.
- Pure TypeScript contracts/helpers for support detection, supported retail formats, barcode normalization, deterministic cooldown and Spanish camera-error messages.
- Deterministic Vitest tests for all requested capability, format, normalization, deduplication and error variants.

Excluded:
- 3B camera component, React/UI integration, changes to QuickProductLookup, `_headers`, jsdom and Playwright E2E.
- SQL/migrations, API/backend, workflows, npm dependencies, external services, video/image/frame uploads, sales automation, checkout or payment behavior.
- Any change to global gates or production state.

## Acceptance criteria

- [ ] AC-1 — `main` verified at exact authorized base SHA and new branch created from that commit.
- [ ] AC-2 — exactly the four authorized new files are included; no other tracked path changes.
- [ ] AC-3 — support detection distinguishes insecure context, missing camera API and missing BarcodeDetector, with clear Spanish manual fallback messages.
- [ ] AC-4 — retail format selection preserves declared order and safely intersects browser-reported formats.
- [ ] AC-5 — barcode normalization strips surrounding whitespace/control ASCII and rejects empty or over-128-character values.
- [ ] AC-6 — identical readings are blocked inside cooldown; expired cooldown and distinct codes are accepted; invalid candidates are rejected.
- [ ] AC-7 — camera error mapping covers all requested DOM error names and an unknown error without exposing technical identifiers.
- [ ] AC-8 — Vitest and applicable GitHub Actions checks complete successfully on exact final commit SHA; local execution is not claimed because this work used GitHub integration without checkout.
- [ ] AC-9 — PR remains OPEN / Draft, not merged, with auto-merge disabled.
- [ ] AC-10 — global gates remain unchanged: AC-6 OPEN, FX_CONTINGENCY_ENABLED=false, BCV_SYNC_ENABLED=false, Issue #53 OPEN/P0, freeze v1.1, PRODUCTION: NOT READY.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| User denies camera permission | medium | 3B keeps manual search available and maps permission errors to commercial Spanish guidance. |
| Current Permissions-Policy blocks camera (`camera=()`) | high | Explicitly documented; only 3B may change it to `camera=(self)`, preserving CSP `connect-src 'self'`. |
| Mobile MediaStreamTrack leak | high | 3B stops every track and detection timer/frame on success, close, hidden tab and unmount; idempotent cleanup and tests required. |
| Repeated barcode reads | medium | Pure deterministic same-code cooldown helper; 3B stops scanning on first accepted code. |
| Internal jargon in user-facing copy | low | Spanish messages describe the next action; never expose DOM error names, stack traces or technical codes. |
| Browser/device lacks native support or secure context | medium | Capability helper returns a typed reason and manual fallback message; no polyfill or paid service. |
| Scope creep into checkout or production gates | critical | No sales automation, backend, SQL, workflows, dependencies or deployment; global gates remain untouched. |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Verify authorized base and conflicts | main at exact SHA; no open conflicting PRs | GitHub branch and open-PR collection read before branch creation | completed |
| Create isolated branch | branch rooted at authorized SHA | GitHub branch creation response | completed |
| Write SDD and ODD | exact scope and mandatory ODD headings | review against ADR and TASK_TEMPLATE | completed |
| Implement pure helpers | typed browser contracts and deterministic functions | source review; Vitest on GitHub Actions | in progress |
| Add helper tests | required edge cases covered | Vitest on exact final SHA | in progress |
| Verify exact file scope and final checks | only four paths; all relevant runs/checks successful | GitHub compare, workflow runs and check/status endpoints | pending |
| Create Draft PR and preserve gates | OPEN / Draft, no merge/auto-merge | PR metadata and repository evidence | pending |
| 3B camera/UI integration | component, headers, QuickProductLookup, jsdom and mobile Playwright | separate future PR | deferred |

## Technical decisions

- Use native `BarcodeDetector` and `navigator.mediaDevices.getUserMedia` only when secure context and browser capability are available; manual search is always available.
- Process camera frames exclusively on-device. No frame, image or video may reach the server.
- Keep the scanner result as a text query for existing `QuickProductLookup`; its existing inventory endpoint prioritizes exact barcode matches when `sort=relevance` is requested.
- Retail formats are ordered and browser capability is intersected when reported. An explicitly empty supported-format list remains empty; unavailable format reporting uses the known retail list as a request hint, not a guarantee.
- Normalize to the products.barcode maximum of 128 characters. Deduplication defaults to 1,500 ms for the same normalized code.
- 3B owns media lifecycle operations and stops tracks/timers/frames on detection, close, hidden document and unmount.
- Current `Permissions-Policy` denies camera. 3B must explicitly allow same-origin camera with `camera=(self)`; keep `connect-src 'self'` unchanged.
- No new npm dependency, SQL, API/backend, workflow or existing-file change is authorized in 3A.

## Closure and handoff

- Final commit SHA: pending
- PR: pending; must be OPEN / Draft
- Checks and exact outcomes: pending exact final SHA; local tests were not run (no checkout/terminal in this execution)
- Acceptance criteria met / unmet: pending GitHub checks and diff verification
- Limitations not verified: physical camera behavior, device/browser compatibility, actual permission prompts and mobile track lifecycle; all belong to 3B device/E2E validation
- Residual risks: camera remains blocked by current Permissions-Policy until separately reviewed 3B change; 3A does not activate camera or change production behavior
- Next step: normal governance review of the Draft PR; implement 3B separately without lifting global gates
