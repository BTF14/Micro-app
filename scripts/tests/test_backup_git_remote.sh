#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
helper="$repo_root/scripts/verify_backup_git_remote.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

git init --bare "$tmp/remote.git" >/dev/null
git init "$tmp/work" >/dev/null
git -C "$tmp/work" config user.name "Backup smoke test"
git -C "$tmp/work" config user.email "backup-smoke@example.invalid"
git -C "$tmp/work" remote add origin "$tmp/remote.git"
mkdir -p "$tmp/work/daily"
printf 'synthetic encrypted artifact bytes\n' >"$tmp/work/daily/backup-2026-11-12T00-00-00Z.dump.age"
(cd "$tmp/work/daily" && sha256sum backup-2026-11-12T00-00-00Z.dump.age > backup-2026-11-12T00-00-00Z.dump.age.sha256)
git -C "$tmp/work" add daily
git -C "$tmp/work" commit -m "synthetic backup" >/dev/null
git -C "$tmp/work" push -u origin HEAD:main >/dev/null 2>&1
git -C "$tmp/work" fetch origin main >/dev/null 2>&1

"$helper" "$tmp/work/daily/backup-2026-11-12T00-00-00Z.dump.age" "$tmp/work" "daily/backup-2026-11-12T00-00-00Z.dump.age"

# Replace the remote object bytes without changing the expected local sidecar.
printf 'tampered ciphertext\n' >"$tmp/work/daily/backup-2026-11-12T00-00-00Z.dump.age"
git -C "$tmp/work" add daily/backup-2026-11-12T00-00-00Z.dump.age
git -C "$tmp/work" commit -m "tamper fixture" >/dev/null
git -C "$tmp/work" push origin HEAD:main >/dev/null 2>&1
git -C "$tmp/work" fetch origin main >/dev/null 2>&1
if "$helper" "$tmp/work/daily/backup-2026-11-12T00-00-00Z.dump.age" "$tmp/work" "daily/backup-2026-11-12T00-00-00Z.dump.age" >/dev/null 2>&1; then
  echo "FAIL: remote tampering was not detected." >&2
  exit 1
fi

echo "PASS: remote readback checksum accepts intact ciphertext and rejects tampering."
