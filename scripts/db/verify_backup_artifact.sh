#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ne 2 ]]; then
  echo "Usage: verify_backup_artifact.sh <daily-directory> <artifact-filename>" >&2
  exit 2
fi

daily_dir="$1"
filename="$2"
if [[ ! "$filename" =~ ^backup-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}Z\.dump\.age$ ]]; then
  echo "Backup artifact filename does not match the canonical UTC timestamp format." >&2
  exit 1
fi

artifact="$daily_dir/$filename"
sidecar="$artifact.sha256"
[[ -f "$artifact" && ! -L "$artifact" && -s "$artifact" ]] || {
  echo "Backup artifact is missing, empty or not a regular file." >&2
  exit 1
}
[[ -f "$sidecar" && ! -L "$sidecar" && -s "$sidecar" ]] || {
  echo "Backup checksum sidecar is missing, empty or not a regular file." >&2
  exit 1
}

mapfile -t sidecar_lines < "$sidecar"
if (( ${#sidecar_lines[@]} != 1 )); then
  echo "Backup checksum sidecar must contain exactly one line." >&2
  exit 1
fi
read -r expected_digest expected_filename <<< "${sidecar_lines[0]}"
if [[ ! "$expected_digest" =~ ^[a-f0-9]{64}$ || "$expected_filename" != "$filename" ]]; then
  echo "Backup checksum sidecar does not match the canonical artifact filename." >&2
  exit 1
fi

actual_digest="$(sha256sum -- "$artifact" | awk '{print $1}')"
if [[ "$actual_digest" != "$expected_digest" ]]; then
  echo "Backup artifact SHA-256 verification failed." >&2
  exit 1
fi

echo "PASS: canonical backup artifact and SHA-256 sidecar verified."
