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
