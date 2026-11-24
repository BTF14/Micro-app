# ODD Task — Remote backup restore under application LOGIN roles

**Date:** 2026-11-11  
**Priority:** P0 / Security Level 1  
**Branch:** `integration/bcv-checkout-rehearsal-20261109`  
**Related:** PR #287, issue #53 (OPEN/P0)

## Finding

The prior `.github/workflows/backup-real-restore.yml` decrypted and restored the remote custom archive as the PostgreSQL service administrator `microapp`. Its check for at least one public table demonstrated archive readability and PostgreSQL restore mechanics, but did not demonstrate that the recovered schema could be operated using the application's least-privilege LOGIN roles.

## Change

Added `scripts/db/restore_remote_backup_ephemeral.sh` and wired the manual remote-archive workflow to it. The runner:

1. Requires a decrypted custom-format archive and explicit disposable target URLs/database name.
2. Refuses any admin identity other than the disposable `microapp` superuser and any target database name other than the declared test database.
3. Creates the synthetic `microapp_migrator`, `microapp_runtime`, and `microapp_bcv_sync` LOGIN roles only when absent; grants CONNECT and the minimum public-schema bootstrap permissions. It does not alter existing role passwords.
4. Restores with `pg_restore --single-transaction --no-owner --no-privileges` using a direct `microapp_migrator` connection.
5. Reads the restored `schema_migrations` ledger and accepts only complete contiguous profiles 0001–0016 (main paired-intent) or 0001–0022 (BCV projection).
6. Selects the pinned main migration bundle (`c5373564413ba086690552c6b7deeab08d7b4a89`) for the 16-migration profile, or the checked-out 22-migration bundle for BCV. Before replay, the ACL helper now verifies every migration filename and SHA-256 against the restored ledger. It refuses drift or incomplete histories.
7. Replays only the ordered ACL statements, never schema/data DDL, then validates object/function ownership, safe role attributes, no role memberships, empty ephemeral auth tables, the migration ledger, and independent runtime/producer LOGIN connectivity.

The synthetic main and BCV restore runners now invoke this same remote-restore runner against a second independent disposable database in addition to their detailed source/restore manifest comparison. This exercises the workflow's restore logic without reading or changing any remote backup or production resource.

## Verified evidence

At HEAD `7b4fdebe846952f1099a4fde323be2dc0f5ce0e8`:
- Backup restore smoke run `42992354071`: main paired-intent job `130428038679` SUCCESS; BCV projection job `130428038320` SUCCESS, including the legacy regression. The remote-restore harness additionally connected independently as runtime and producer; it executed a real `SELECT` against `public.organizations` as `microapp_runtime` and verified runtime SELECT plus absence of schema CREATE.
- Playwright `42991705336` SUCCESS.
- PostgreSQL migration runner `42991705483` SUCCESS.
- Database migration validation `42991705628` SUCCESS.
- Semgrep `42991705476` SUCCESS.
- CI `42991705339` was still running at the time of this note; the remaining workflows must be rechecked on the final documentation HEAD.

Earlier iterations failed closed on the administrator boolean-text comparison and were corrected before the successful runs. The final runtime read probe also passed in both profiles.

## Explicit limits

- The actual remote-archive workflow remains `workflow_dispatch` only and was **not** run. No remote backup was downloaded or decrypted in this task.
- The synthetic harness exercises the same script with synthetic archives and temporary keys, not the actual production archive or private age key.
- Main and BCV profiles are accepted only when their migration-ledger versions and per-file checksums match the exact supported bundles. An unsupported/partial profile fails closed.
- The actual `DATABASE_URL_BACKUP_RO` identity diagnostic remains pending until that diagnostic reaches the default branch and a naturally scheduled backup run includes it. Do not dispatch backup manually.
- Provider-specific production role provisioning, secure credential delivery, external alerting, measured RPO/RTO and $0 cost remain open.
- No Neon, production data, remote roles/grants, secrets, Cron, DNS, Cloudflare settings, billing, or deployment were touched.

Issue #53 remains OPEN/P0. PR #287 remains OPEN/Draft. Production remains NOT READY.

## Addendum — actual producer write probe, rollback-only — 2026-11-11

A second review identified that checking only the producer LOGIN was weaker than the claim "producer permissions usable". The restore runner now performs an effective write-path probe **only for the BCV 0001–0022 profile**, where migration 0022 defines the dedicated producer contract:
- verifies the singleton `bcv_sync_state` row is readable;
- updates only the granted producer columns (`attempt_id`, timestamps, `last_outcome`, `updated_at`);
- inserts a uniquely tagged synthetic `exchange_rates` row using only the granted insert columns and reads its returned UUID using the permitted `id` column privilege;
- updates only `validation_status`;
- rolls the entire transaction back unconditionally.

The main 0001–0016 paired-intent profile predates migrations 0021/0022 and therefore intentionally does **not** run the BCV table write probe; it verifies only the synthetic producer LOGIN exists, not that it has BCV grants. This prevents incorrectly applying the later profile's permission contract to the historical schema.

The probe was corrected after inspection found an indented heredoc terminator in the first draft; the corrected shell block is what the passing workflow exercised. The complete main + BCV smoke run at HEAD `3e6f6f508af316ab102ac0d7fcb7c56bcb65d8eb` is `42993480715`: main job `130431717359` SUCCESS; BCV job `130431717962` SUCCESS, including the legacy regression. All 11 PR workflows at that exact HEAD passed: CI `42993480688`, migration validation `42993480726`, PostgreSQL migration runner `42993480716`, backup restore `42993480715`, Playwright `42993480670`, dependency review `42993480700`, ODD docs `42993480705`, Semgrep `42993480727`, security scan `42993480720`, secret history `42993480721`, project dashboard `42993480717`.

This remains synthetic evidence only. The remote artifact workflow was not dispatched and no remote backup/age key was accessed.

## Addendum — final-profile ACL oracle and hardened ledger parsing — 2026-11-11

The restore grant helper now rejects migration-ledger filenames unless they are safe numbered SQL basenames matching the contiguous version, and rejects checksums unless they are 64-character lowercase SHA-256 digests. It still verifies each exact file's checksum before replaying ACL statements.

A strict post-restore check initially reused migration 0012's historical assertion file after all 16 migrations had been replayed. That test failed because migrations 0013 and 0015 legitimately grant the runtime role access to BCV rates and checkout sales/payments; those are final-profile permissions, not security regressions. The historical migration assertion is valid at migration 0012's point in time, not as the final 0016 oracle. It was not weakened. Instead, added `scripts/db/restore_role_assertions_main.sql`, which validates the final main 0001–0016 runtime contract: required checkout/rate access is present; intent-table access, branch/warehouse mutations, audit reads/mutations and unsafe default ACLs remain absent. The BCV 0001–0022 profile continues to run migration 0022's full producer/runtime effective-privilege assertions.

The BCV restore probe also performs the producer's permitted state update, synthetic rate insert and validation-status update in a single transaction that is rolled back. It is intentionally not run for the main 0001–0016 profile, which predates migrations 0021/0022. The synthetic restore workflow now also runs on pushes to the integration branch, in addition to PR path-filtered runs, so this profile gate cannot silently remain unexecuted on an integration-only update.

**Validated exact HEAD:** `99ed19bd4b0f13503dc875215532e3c83941d168`. PR workflow runs 11/11 SUCCESS: CI `42995277583`; database migration validation `42995277784`; PostgreSQL migration runner `42995277586`; backup restore smoke `42995277769`; Playwright `42995277707`; dependency review `42995277737`; ODD docs `42995278007`; Semgrep `42995277801`; security scan `42995277685`; secret history `42995277589`; project dashboard `42995278070`. Independent push backup smoke `42995267480` also SUCCESS: main job `130437669142`, BCV job `130437668885`, legacy regression included.

The earlier failed run `42994254096` is a retained test-oracle failure, not hidden: it caught that the historical 0012 assertion was being applied at the final schema point. The profile-specific final assertion replaced it and the corrected main + BCV restore passed.

No remote backup artifact or age key was accessed; `.github/workflows/backup-real-restore.yml` remains manual and was not dispatched. No production, Neon, remote role/grant, secrets, Cron, DNS, Cloudflare sensitive setting, billing or deployment was changed.

## Follow-up — effective role probes

A follow-up hardening added live connection/privilege probes to the shared runner:
- `microapp_runtime` connects directly, reads `public.organizations`, and is explicitly denied schema CREATE.
- BCV profile: `microapp_bcv_sync` reads its singleton state, updates only its narrow status columns, inserts one synthetic exchange-rate row and changes its validation status, all inside a transaction that is rolled back.
- Main profile intentionally does not pretend to exercise the BCV producer contract because that historical schema predates the dedicated producer migration.

At branch HEAD `f6c453d928ffaef4ab15efc5733bd3c7001089e3`, the exact-HEAD PR workflows are 13/13 SUCCESS, including backup restore smoke `42997279023` and Playwright `42997278934`. CI `42997279209` completed SUCCESS. The push-triggered backup smoke `42997267912` also succeeded. PR #287 remains OPEN/Draft; issue #53 remains OPEN/P0.
