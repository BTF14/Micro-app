#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ne 3 ]]; then
  echo "Usage: verify_backup_git_remote.sh <local-artifact> <git-repository> <remote-path>" >&2
  exit 2
fi

artifact="$1"
repository="$2"
remote_path="$3"
sidecar="${artifact}.sha256"

if [[ ! -f "$artifact" || ! -s "$artifact" || ! -f "$sidecar" ]]; then
  echo "Backup artifact or checksum sidecar is missing." >&2
  exit 1
fi
if [[ ! "$remote_path" =~ ^[A-Za-z0-9._/-]+$ || "$remote_path" == *".."* ]]; then
  echo "Remote artifact path is invalid." >&2
  exit 2
fi

# Validate the locally generated sidecar before trusting its expected digest.
if ! (cd "$(dirname "$artifact")" && sha256sum --check --strict --status "$(basename "$sidecar")"); then
  echo "Local encrypted backup checksum validation failed." >&2
  exit 1
fi
expected="$(awk 'NR == 1 { print $1 }' "$sidecar")"
if [[ ! "$expected" =~ ^[a-fA-F0-9]{64}$ ]]; then
  echo "Backup checksum sidecar is malformed." >&2
  exit 1
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
if ! git -C "$repository" show "origin/main:$remote_path" >"$tmp" 2>/dev/null; then
  echo "Remote backup readback failed." >&2
  exit 1
fi
actual="$(sha256sum "$tmp" | awk '{ print $1 }')"
if [[ "$actual" != "$expected" ]]; then
  echo "Remote encrypted backup checksum mismatch." >&2
  exit 1
fi
echo "PASS: remote encrypted backup bytes match the verified SHA-256."
