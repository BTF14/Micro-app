# ODD Task — Preserve ephemeral auth schema while excluding ephemeral data

**Date:** 2026-11-11  
**Priority:** P0 / Security Level 1  
**Branch:** `integration/bcv-checkout-rehearsal-20261109`  
**Related:** PR #287, PR #303, issue #53 (OPEN/P0)

## Finding

The production backup workflow used `pg_dump --exclude-table=` for `auth_sessions`, `auth_rate_limits`, and `auth_bootstrap_attempts`. PostgreSQL excludes the table definitions and data. Restoring such a dump therefore removes the tables required by live authentication/session flows. The restored `schema_migrations` ledger still marks their creation migrations as applied, so a normal idempotent migration-runner invocation would not recreate the missing tables.

The security intent is to exclude ephemeral authentication **rows**, not the database structures needed for future logins.

## Decision

Use `pg_dump --exclude-table-data=` for all three tables. Preserve table definitions, indexes, constraints, triggers, sequences, ownership and ACLs in the synthetic schema profile; export zero ephemeral rows. This avoids retaining sessions, rate-limit windows, or pending bootstrap attempts while ensuring the restored schema remains operationally complete.

## Implementation

- Production backup workflow uses `--exclude-table-data` rather than `--exclude-table`.
- Main paired-intent and BCV projection smoke runners use the same data-only exclusion.
- Both full-schema manifests include ephemeral table structure, constraints, indexes, triggers, sequences, ACL/RLS and metadata.
- Each source fixture must contain one synthetic row in each ephemeral table; restored target must contain all three table definitions and exactly zero rows.
- Legacy 13-table regression separately asserts all three ephemeral table schemas exist and are empty after restore.
- Backup restore workflow path filters include `.github/workflows/backup.yml`, ensuring future changes to the production exclusion policy rerun the synthetic coverage.

## Acceptance gates

- Main profile independently applies migrations 0001–0016, round-trips encrypted dump, and proves ephemeral table schema exists with zero rows.
- BCV profile independently applies migrations 0001–0022, round-trips encrypted dump, and proves the same.
- Legacy regression proves the same data-only exclusion behavior.
- No auth session token/hash, rate-limit row, or pending bootstrap record appears in restored target.
- Exact-HEAD CI succeeds; inspect both restore jobs and all other workflow runs.
- No production backup execution, manual dispatch, secret read, Neon access, role/grant mutation, Cron change, deployment, billing or real data.

## Remaining production boundary

This change repairs schema completeness for the three excluded tables. It does not prove the identity or least privilege of `DATABASE_URL_BACKUP_RO`, production ownership/grants bootstrap under `--no-owner --no-privileges`, remote artifact recovery, RPO/RTO, external alert delivery, or total cost $0. Issue #53 remains OPEN/P0; production NOT READY.
