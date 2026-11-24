#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
helper="$script_dir/backup_git_askpass.sh"
test_token="ephemeral-backup-askpass-test-token"

username="$(GH_TOKEN="$test_token" bash "$helper" "Username for 'https://github.com':")"
password="$(GH_TOKEN="$test_token" bash "$helper" "Password for 'https://github.com':")"

[[ "$username" == "x-access-token" ]] || { echo "FAIL: unexpected username response"; exit 1; }
[[ "$password" == "$test_token" ]] || { echo "FAIL: password response did not match the ephemeral token"; exit 1; }

if GH_TOKEN="$test_token" bash "$helper" "One-time code for 'https://github.com':" >/dev/null 2>&1; then
  echo "FAIL: unknown prompt was accepted"
  exit 1
fi

if GH_TOKEN="" bash "$helper" "Password for 'https://github.com':" >/dev/null 2>&1; then
  echo "FAIL: missing GH_TOKEN was accepted"
  exit 1
fi

if grep -F "$test_token" "$helper" >/dev/null; then
  echo "FAIL: test token was embedded in the helper"
  exit 1
fi

echo "PASS: GIT_ASKPASS username/password contract and fail-closed behavior"

workflow="$script_dir/../.github/workflows/backup.yml"
[[ -s "$workflow" ]] || { echo "FAIL: backup workflow not found"; exit 1; }
if grep -F 'https://x-access-token:' "$workflow" >/dev/null || grep -F '${GH_TOKEN}' "$workflow" >/dev/null; then
  echo "FAIL: backup workflow embeds GH_TOKEN in a Git URL or command"
  exit 1
fi
grep -F 'export GIT_ASKPASS=' "$workflow" >/dev/null || { echo "FAIL: backup workflow does not configure GIT_ASKPASS"; exit 1; }
grep -F 'export GIT_ASKPASS_REQUIRE=force' "$workflow" >/dev/null || { echo "FAIL: backup workflow does not require askpass"; exit 1; }
grep -F 'git -c credential.helper= -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=30 clone --depth 1 "https://github.com/${BACKUP_REPO}.git"' "$workflow" >/dev/null || { echo "FAIL: backup workflow clone URL is not credential-free or transport-bounded"; exit 1; }
grep -F 'backup_token="${GH_TOKEN:?Falta el secreto BACKUP_REPO_TOKEN}"' "$workflow" >/dev/null || { echo "FAIL: backup token is not captured with fail-closed validation"; exit 1; }
grep -F 'unset GH_TOKEN' "$workflow" >/dev/null || { echo "FAIL: backup token remains globally exported to subsequent commands"; exit 1; }
grep -F 'GH_TOKEN="$backup_token" git -c credential.helper= -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=30 clone' "$workflow" >/dev/null || { echo "FAIL: clone does not receive a command-scoped token"; exit 1; }
grep -F 'GH_TOKEN="$backup_token" git -C "$backup_repo_dir" -c credential.helper= -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=30 push' "$workflow" >/dev/null || { echo "FAIL: push does not receive a command-scoped token"; exit 1; }
grep -F 'bash "$GITHUB_WORKSPACE/scripts/verify_backup_git_remote.sh"' "$workflow" >/dev/null || { echo "FAIL: remote ciphertext readback checksum is missing"; exit 1; }
grep -F 'sha256sum --check --strict "backup-${STAMP}.dump.age.sha256"' "$workflow" >/dev/null || { echo "FAIL: local ciphertext checksum is not verified before transfer"; exit 1; }
grep -F 'Encrypted backup transfer failed after bounded retries' "$workflow" >/dev/null || { echo "FAIL: bounded push failure handling is missing"; exit 1; }
grep -F 'raw transport output was suppressed' "$workflow" >/dev/null || { echo "FAIL: raw transport logs may be exposed"; exit 1; }
grep -F 'trap ' "$workflow" | grep -F 'rm -f "$askpass"' >/dev/null || { echo "FAIL: backup workflow does not clean up the temporary helper"; exit 1; }

echo "PASS: backup workflow does not persist Git credentials in remote URLs"

