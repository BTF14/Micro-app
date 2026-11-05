# ODD task: validate count snapshots and count-derived ledger deltas

- Status: in progress
- Risk: critical (inventory integrity)
- Issue: #53
- Branch: feat/inventory-ledger-validation-20261105
- Base: PR #207 HEAD 962b5e9d34cc23d7bb5929cd17b4599f4da06db4
- Started: 2026-11-05 UTC

## Objective

Close two database-level integrity gaps in the existing count workflow:
1. A physical count can currently be confirmed directly in SQL without the expected quantity/version snapshot required for stale/ABA protection.
2. A count-derived ledger movement is currently validated for count status/type/product membership, but its delta, unit cost, reason and actor are not checked against the confirmed count line/document.

Do not claim this task provides universal balance↔ledger coupling for every possible writer; that remains a separate gate.

## Authorization and scope

The owner authorized autonomous engineering changes when necessary, verified and safe. Work only in this feature branch and disposable PostgreSQL CI. Do not change main, merge PRs, deploy, access Neon, read/change secrets, touch real data, or alter Cloudflare settings/DNS/billing.

## Evidence from current schema

- `0005_warehouse_inventory.sql` defines `inventory_count_lines.expected_on_hand_quantity` and `expected_balance_version`, but its lifecycle trigger only requires lines to exist when confirming; it does not require snapshot fields for physical counts.
- `validate_count_inventory_movement()` checks confirmed count, movement type and product line, but does not compare `quantity_delta` to the count snapshot; nor does it bind movement actor/reason/unit_cost to the confirmed count/line.
- The current API writes correct values in the same transaction and checks stale/ABA under warehouse/balance locks. This task adds DB-side validation against direct SQL bypasses.
- `inventory_balances` remains directly mutable without a universal mandatory ledger link. This is explicitly outside the narrow scope of this migration and remains a separate P0.

## Acceptance criteria

- [ ] A physical count cannot transition to confirmed unless every line has non-null expected quantity and expected balance version.
- [ ] An opening count cannot transition to confirmed with physical snapshot fields populated.
- [ ] A count-derived opening movement must equal the line's counted quantity.
- [ ] A count-derived physical adjustment must equal counted quantity minus expected on-hand snapshot; mismatches are rejected.
- [ ] Count-derived movement actor and reason must match the confirmed count; unit cost must match the count line.
- [ ] Existing correct API behavior and count confirmation tests remain unchanged and pass.
- [ ] PostgreSQL assertions cover missing snapshots, incorrect movement delta, actor, reason and unit cost, plus successful valid movement.
- [ ] CI and migration-check apply 0001–0008 in order from a clean PostgreSQL 18 database; migration rollback is tested.
- [ ] Exact HEAD CI, PostgreSQL migration assertions, full diff review and ODD validation pass.
- [ ] Documentation clearly states this closes count-derived validation but does not yet prove universal balance↔ledger consistency.

## Risks and constraints

- Confirmed historical counts must remain immutable; the migration is additive and does not rewrite old records.
- Existing draft physical counts without snapshots will be unconfirmable after migration; this is intentional fail-closed behavior. No production rows are inspected or changed here.
- The application already captures snapshots and emits correct movement metadata; CI must prove no behavior regression.
- Never weaken append-only triggers or stale/ABA checks to make tests pass.

## Execution log

- 2026-11-05: inspected migration 0005 and assertions on the consolidated #207 branch. Confirmed the gaps described above. No source code or production resources modified yet.
