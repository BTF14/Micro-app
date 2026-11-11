#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
validator="$repo_root/scripts/db/verify_backup_artifact.sh"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

filename="backup-2026-11-11T07-00-00Z.dump.age"
artifact="$tmpdir/$filename"
sidecar="$artifact.sha256"

expect_failure() {
  local description="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "Expected artifact validation failure: $description" >&2
    exit 1
  fi
}

printf 'synthetic encrypted bytes\n' > "$artifact"
sha256sum -- "$artifact" > "$sidecar"
bash "$validator" "$tmpdir" "$filename" >/dev/null

expect_failure "non-canonical filename" bash "$validator" "$tmpdir" "../$filename"

printf '%064d  %s\n' 0 "$filename" > "$sidecar"
expect_failure "checksum mismatch" bash "$validator" "$tmpdir" "$filename"

sha256sum -- "$artifact" | sed 's/  .*/  backup-2026-11-10T07-00-00Z.dump.age/' > "$sidecar"
expect_failure "sidecar filename mismatch" bash "$validator" "$tmpdir" "$filename"

sha256sum -- "$artifact" > "$sidecar"
printf 'extra line\n' >> "$sidecar"
expect_failure "multiple sidecar lines" bash "$validator" "$tmpdir" "$filename"

sha256sum -- "$artifact" > "$sidecar"
printf 'tampered bytes\n' >> "$artifact"
expect_failure "artifact changed after checksum" bash "$validator" "$tmpdir" "$filename"

echo "PASS: backup artifact validator rejects malformed names, sidecars and modified bytes."
