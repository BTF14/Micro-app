# ODD adoption and agent governance refresh

## Specs

- **S1 — Owner intent:** The owner authorized a professional review and cleanup of Micro-app's agent workflow, including evaluating Organic Driven Development (ODD), ECC, and tester-army/e2e. The owner explicitly granted broad technical discretion for the project's benefit.
- **S2 — Workflow:** ODD becomes the default implementation workflow; investigation/proposal-only work remains read-only; work size and risk determine the amount of durable tracking.
- **S3 — Preserve domain knowledge:** Existing `docs/sdd/` models, decisions, authorization contracts, and concurrency designs remain valid unless independently superseded. Retiring SDD as a workflow must not delete domain decisions.
- **S4 — Safety:** Preserve the Constitution, cost target $0, production/Neon/data gates, security Level 1 gate, approved role-permission matrix, no force-push, and no merge/deploy without required authority.
- **S5 — Tooling:** ECC and tester-army/e2e are evaluated selectively; do not install broad profiles, hooks, paid providers, or telemetry without a separate verified pilot.

## Tasks

- [x] ODD-01 Inspect current PR #197, repository governance files, and exact-SHA CI.
- [x] ODD-02 Review official Gentle AI ODD workflow and trigger rules.
- [x] ODD-03 Review ECC installation/runtime guidance and Copilot adapter limits.
- [x] ODD-04 Review tester-army/e2e API, licensing, model/provider and telemetry disclosures.
- [x] ODD-05 Add `docs/ODD_WORKFLOW.md` with Micro-app-specific safety and evidence rules.
- [x] ODD-06 Update `AGENTS.md`, Constitution and agent profiles to route through ODD.
- [x] ODD-07 Retire SDD as active workflow while preserving domain SDD documents and a redirect.
- [x] ODD-08 Archive the unexecuted Spec Kit proposal and update tool evaluation records.
- [ ] ODD-09 Verify full diff, links, documentation checks, exact-SHA CI and PR metadata.

## Log

- 2026-11-04: Original owner request: "Te doy rienda suelta de hacer lo que Desees te lo autorizó por el bien del proyecto ... investige que ahora no se use sdd si no odd como lo hace gentleman ia ... también actualizaron a ecc ... también actualizaron a tester-army/e2e".
- Official sources reviewed: Gentle AI usage/trigger-rules; ECC README and Copilot target; tester-army/e2e README.
- Verified existing PR #197 was open, Draft, not merged; initial HEAD `a0e4416b258b15a319e628fe73af63fe1164b9dd`; 9 workflow runs completed successfully at that SHA.
- This change is documentation/governance only. No application code, dependencies, hooks, credentials, Neon, production or real data changed.
- No external agent runtime, Engram, ECC, Gentle-AI, or tester-army/e2e has been installed or executed.
