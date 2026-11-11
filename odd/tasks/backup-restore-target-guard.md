# ODD Task — Fail-closed target and artifact-name validation for remote restore

**Date:** 2026-11-11  
**Priority:** P0 / Security Level 1  
**Branch:** `integration/bcv-checkout-rehearsal-20261109`  
**Related:** PR #287, issue #53 (OPEN/P0)

## Finding

Static review of the manual remote-archive rehearsal found two defense-in-depth gaps:

1. `scripts/db/restore_remote_backup_ephemeral.sh` checked the disposable administrator identity and database name, but did not independently prove that the PostgreSQL server was loopback/local or that the migrator/runtime/producer URLs reached the same target.
2. `.github/workflows/backup-real-restore.yml` accepted an artifact filename from the private backup repository without a strict timestamp filename allowlist and interpolated that output directly into a later shell script summary.

The configured workflow currently hardcodes the disposable PostgreSQL service. These are guard gaps in reusable code and untrusted-input handling, not evidence that a production target was contacted or that an exploit occurred.

## Authorized scope

Harden only the integration branch's synthetic/manual restore tooling. No dispatch of the manual workflow, no remote archive download, no secret access, no Neon, no real data, no role/grant changes, no Cloudflare/DNS/billing/deployment.

## Required changes

- Require the admin restore connection to report a loopback server address and port 5432, with the exact declared disposable database.
- Require migrator, runtime and producer direct LOGIN connections to resolve to the same loopback server, port and database.
- Validate artifact filenames against the exact generated timestamp format before writing GitHub outputs or using them in paths.
- Validate the checksum sidecar as one digest plus the exact expected filename; verify the downloaded artifact bytes without trusting a sidecar-supplied path.
- Pass the filename to later shell steps through an environment variable rather than interpolating untrusted output into shell source.
- Add a disposable unit/guard test that proves a non-loopback target is refused before role bootstrap or restore.
- Re-run the existing main 0001–0016 and BCV 0001–0022 synthetic restore profiles and all exact-HEAD workflows.

## Acceptance and limits

- The guard test rejects a non-loopback PostgreSQL server.
- All four connections must identify the same local target and expected LOGIN roles.
- A malformed filename or sidecar fails closed.
- Existing synthetic restore manifests, ownership/ACL assertions and role probes remain passing.
- The real remote-archive workflow remains unexecuted. These changes do not prove real artifact recoverability, backup principal identity, least privilege on Neon, RPO/RTO, alert delivery or cost $0.

Issue #53 remains OPEN/P0; production remains NOT READY.
