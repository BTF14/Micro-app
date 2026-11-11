#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/bin"

cat > "$tmp/bin/sudo" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
[[ "${1:-}" == "apt-get" ]] || exit 64
count=0
[[ -f "$APT_RETRY_TEST_STATE_FILE" ]] && count="$(cat "$APT_RETRY_TEST_STATE_FILE")"
count=$((count + 1))
printf '%s\n' "$count" > "$APT_RETRY_TEST_STATE_FILE"
printf '%s\n' "$*" >> "$APT_RETRY_TEST_LOG"
if ((count <= APT_RETRY_TEST_FAILS)); then
  exit 42
fi
exit 0
MOCK
cat > "$tmp/bin/sleep" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK
chmod +x "$tmp/bin/sudo" "$tmp/bin/sleep"

export PATH="$tmp/bin:$PATH"
export APT_RETRY_TEST_STATE_FILE="$tmp/state"
export APT_RETRY_TEST_LOG="$tmp/log"
export APT_RETRY_MAX_ATTEMPTS=3
export APT_RETRY_BASE_DELAY_SECONDS=0
export APT_RETRY_TEST_FAILS=2

bash "$repo_root/scripts/ci/apt-retry.sh" update
[[ "$(cat "$APT_RETRY_TEST_STATE_FILE")" == "3" ]]
grep -F -- "-o APT::Update::Error-Mode=any" "$APT_RETRY_TEST_LOG" >/dev/null

: > "$APT_RETRY_TEST_STATE_FILE"
: > "$APT_RETRY_TEST_LOG"
export APT_RETRY_TEST_FAILS=99
if bash "$repo_root/scripts/ci/apt-retry.sh" install -y package-that-does-not-exist; then
  echo "Expected persistent apt failure to remain non-zero." >&2
  exit 1
fi
[[ "$(cat "$APT_RETRY_TEST_STATE_FILE")" == "3" ]]

echo "PASS: apt retries are bounded, update is strict, and persistent failure remains non-zero."
