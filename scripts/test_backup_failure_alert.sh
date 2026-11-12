#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
helper="$repo_root/scripts/backup_failure_alert.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/bin"

cat >"$tmp/bin/gh" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >>"$GH_MOCK_LOG"
case "$1 $2" in
  "label create")
    exit 0
    ;;
  "issue list")
    printf '%s' "${GH_MOCK_EXISTING_ISSUE:-}"
    ;;
  "issue create")
    while (($#)); do
      if [[ "$1" == "--body" ]]; then
        printf '%s' "$2" >"$GH_MOCK_BODY"
        break
      fi
      shift
    done
    exit 0
    ;;
  "issue comment")
    while (($#)); do
      if [[ "$1" == "--body" ]]; then
        printf '%s' "$2" >"$GH_MOCK_BODY"
        break
      fi
      shift
    done
    exit 0
    ;;
  *)
    echo "unexpected gh invocation" >&2
    exit 90
    ;;
esac
MOCK
chmod +x "$tmp/bin/gh"

export PATH="$tmp/bin:$PATH"
export GH_TOKEN="synthetic-token-not-used"
export GITHUB_REPOSITORY="BTF14/Micro-app"
export GITHUB_RUN_ID="987654321"
export GITHUB_SERVER_URL="https://github.com"
export GH_MOCK_LOG="$tmp/gh.log"
export GH_MOCK_BODY="$tmp/body.md"

# Successful jobs must be a true no-op and must not require GitHub API calls.
: >"$GH_MOCK_LOG"
BACKUP_JOB_STATUS=success bash "$helper"
test ! -s "$GH_MOCK_LOG"

# Failed job with no existing alert creates exactly one labelled issue.
: >"$GH_MOCK_LOG"
unset GH_MOCK_EXISTING_ISSUE || true
BACKUP_JOB_STATUS=failure bash "$helper"
grep -q '^label create P0: Backup Failure .*--force' "$GH_MOCK_LOG"
grep -q '^issue list ' "$GH_MOCK_LOG"
grep -q '^issue create ' "$GH_MOCK_LOG"
! grep -q '^issue comment ' "$GH_MOCK_LOG"
grep -q '987654321' "$GH_MOCK_BODY"
grep -q 'America/Caracas' "$GH_MOCK_BODY"
grep -q 'https://github.com/BTF14/Micro-app/actions/runs/987654321' "$GH_MOCK_BODY"
grep -q 'Raw runner/transport logs' "$GH_MOCK_BODY"

# Failed job with an existing open alert adds a comment, avoiding duplicates.
: >"$GH_MOCK_LOG"
export GH_MOCK_EXISTING_ISSUE="123"
BACKUP_JOB_STATUS=failure bash "$helper"
grep -q '^issue comment 123 ' "$GH_MOCK_LOG"
! grep -q '^issue create ' "$GH_MOCK_LOG"
grep -q '987654321' "$GH_MOCK_BODY"

# Verify that the workflow actually wires the helper with the required guard and token scope.
workflow="$repo_root/.github/workflows/backup.yml"
grep -Fq '  issues: write' "$workflow"
grep -Fq '        if: failure()' "$workflow"
grep -Fq '        continue-on-error: true' "$workflow"
grep -Fq '          GH_TOKEN: ${{ github.token }}' "$workflow"
grep -Fq '          BACKUP_JOB_STATUS: ${{ job.status }}' "$workflow"
grep -Fq '        run: bash scripts/backup_failure_alert.sh' "$workflow"

echo "PASS: success no-op, failed-run issue creation, and existing-issue update."
