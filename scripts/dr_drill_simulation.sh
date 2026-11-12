#!/usr/bin/env bash
set -euo pipefail

# Pinned to the disposable PostgreSQL 18 service in backup-restore-smoke.yml.
# Never accept arbitrary DB targets, Neon, staging or production.
expected_source_url="postgresql://microapp:microapp-test-only@localhost:5432/microapp_source"
if [[ "${SOURCE_URL:-}" != "$expected_source_url" ]]; then
  echo "Refusing DR drill: SOURCE_URL must be the fixed disposable CI PostgreSQL 18 URL." >&2
  exit 2
fi
if [[ "$(psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -Atqc 'SELECT current_database()')" != "microapp_source" ]]; then
  echo "Refusing DR drill: connected database is not microapp_source." >&2
  exit 2
fi

report_dir="${DR_DRILL_REPORT_DIR:-$PWD/dr-drill-report}"
mkdir -p "$report_dir"
report_dir="$(cd "$report_dir" && pwd)"
log_file="$report_dir/dr-drill.log"
export DR_DRILL_REPORT_DIR="$report_dir"
start_ns="$(python3 -c 'import time; print(time.monotonic_ns())')"
set +e
bash scripts/test_backup_restore_schema_bcv.sh 2>&1 | tee "$log_file"
drill_status=${PIPESTATUS[0]}
set -e
end_ns="$(python3 -c 'import time; print(time.monotonic_ns())')"
rto_ms="$(( (end_ns - start_ns) / 1000000 ))"
rto_seconds="$(python3 -c 'import sys; print(f"{int(sys.argv[1]) / 1000:.3f}")' "$rto_ms")"
log_sha="$(sha256sum "$log_file" | awk '{print $1}')"
script_sha="$(sha256sum scripts/test_backup_restore_schema_bcv.sh | awk '{print $1}')"
fixture_sha="$(sha256sum scripts/backup_restore_fixture_bcv.sql | awk '{print $1}')"
artifact_sha="$(cat "$report_dir/backup-artifact.sha256.value" 2>/dev/null || true)"
source_manifest_sha="$(cat "$report_dir/source-manifest.sha256" 2>/dev/null || true)"
restored_manifest_sha="$(cat "$report_dir/restored-manifest.sha256" 2>/dev/null || true)"

python3 - "$report_dir/report.json" "$drill_status" "$rto_ms" "$rto_seconds" "$log_sha" "$script_sha" "$fixture_sha" "$artifact_sha" "$source_manifest_sha" "$restored_manifest_sha" <<'PY'
import json, pathlib, sys
(path, status, rto_ms, rto_seconds, log_sha, script_sha, fixture_sha,
 artifact_sha, source_sha, restored_sha) = sys.argv[1:]
payload = {
  "kind": "synthetic-postgresql-18-dr-drill",
  "database_target": "microapp_source -> microapp_schema_restore (disposable CI only)",
  "exit_status": int(status),
  "rto_seconds": float(rto_seconds),
  "rto_limit_seconds": 900,
  "rto_under_15_minutes": int(status) == 0 and int(rto_ms) < 900000,
  "rpo": {
    "synthetic_snapshot_lag_seconds": 0,
    "operational_rpo_measured": False,
    "note": "The fixture is generated immediately before dump; this is not evidence of real backup cadence or operational RPO."
  },
  "sha256": {
    "encrypted_dump": artifact_sha or None,
    "source_manifest": source_sha or None,
    "restored_manifest": restored_sha or None,
    "drill_log": log_sha,
    "restore_harness": script_sha,
    "synthetic_fixture": fixture_sha
  },
  "schema_data_manifest_match": bool(source_sha and source_sha == restored_sha),
}
pathlib.Path(path).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(json.dumps(payload, indent=2))
PY

{
  echo "### Synthetic PostgreSQL 18 DR drill"
  echo "- Result: $([[ "$drill_status" == "0" ]] && echo PASS || echo FAIL)"
  echo "- RTO: ${rto_seconds}s (required < 900s)"
  echo "- Synthetic RPO fixture lag: 0s (operational RPO not measured)"
  echo "- Encrypted dump SHA-256: ${artifact_sha:-missing}"
  echo "- Source/restore manifest SHA-256: ${source_manifest_sha:-missing} / ${restored_manifest_sha:-missing}"
  echo "- Report: `dr-drill-report/report.json`"
} >> "${GITHUB_STEP_SUMMARY:-/dev/null}"

if [[ "$drill_status" != "0" ]]; then exit "$drill_status"; fi
if (( rto_ms >= 900000 )); then
  echo "DR RTO exceeded the 15-minute CI objective." >&2
  exit 1
fi
if [[ -z "$artifact_sha" || -z "$source_manifest_sha" || "$source_manifest_sha" != "$restored_manifest_sha" ]]; then
  echo "DR checksum evidence is incomplete or source/restore manifests differ." >&2
  exit 1
fi
echo "PASS: synthetic DR drill completed in ${rto_seconds}s; operational RPO/RTO remain uncertified."
