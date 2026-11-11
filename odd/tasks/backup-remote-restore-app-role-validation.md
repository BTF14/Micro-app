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
