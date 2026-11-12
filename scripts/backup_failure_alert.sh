#!/usr/bin/env bash
set -euo pipefail

# The job-status guard makes the success path a deterministic no-op even if
# this helper is invoked outside the workflow's if: failure() condition.
if [[ "${BACKUP_JOB_STATUS:-failure}" != "failure" ]]; then
  exit 0
fi

: "${GH_TOKEN:?GitHub Actions token is required}"
: "${GITHUB_REPOSITORY:?GitHub repository context is required}"
: "${GITHUB_RUN_ID:?GitHub run ID is required}"
: "${GITHUB_SERVER_URL:?GitHub server URL is required}"

if [[ ! "$GITHUB_REPOSITORY" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] ||
   [[ ! "$GITHUB_RUN_ID" =~ ^[0-9]+$ ]] ||
   [[ ! "$GITHUB_SERVER_URL" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]]; then
  echo "Backup failure alert skipped: invalid GitHub context." >&2
  exit 1
fi

readonly ALERT_LABEL="P0: Backup Failure"
readonly ALERT_TITLE="[P0] Scheduled database backup failed"
readonly RUN_URL="${GITHUB_SERVER_URL%/}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
readonly ALERT_TIME="$(TZ=America/Caracas date '+%Y-%m-%d %H:%M:%S %Z')"
readonly ALERT_BODY="$(cat <<EOF
## Encrypted database backup failure

- **Run ID:** ${GITHUB_RUN_ID}
- **Timestamp (America/Caracas):** ${ALERT_TIME}
- **Run:** ${RUN_URL}
- **Failure category:** One or more backup workflow steps failed. The failure may involve backup generation, encryption, checksum verification, remote transfer, or retention.

Raw runner/transport logs and secret-bearing diagnostics are intentionally excluded. Open the run above and inspect its access-controlled step result.
EOF
)"

# Ensure the requested label exists; --force makes this idempotent.
if ! gh label create "$ALERT_LABEL" --color "B60205" \
  --description "P0: encrypted database backup failed" --force \
  --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
  echo "Backup failure alert could not ensure its GitHub label." >&2
  exit 1
fi

if ! existing_issue="$(gh issue list --repo "$GITHUB_REPOSITORY" \
  --state open --label "$ALERT_LABEL" --json number \
  --jq '.[0].number // empty' 2>/dev/null)"; then
  echo "Backup failure alert could not query existing alert issues." >&2
  exit 1
fi

if [[ -n "$existing_issue" ]]; then
  if [[ ! "$existing_issue" =~ ^[0-9]+$ ]]; then
    echo "Backup failure alert received an invalid issue reference." >&2
    exit 1
  fi
  if ! gh issue comment "$existing_issue" --repo "$GITHUB_REPOSITORY" \
    --body "$ALERT_BODY" >/dev/null 2>&1; then
    echo "Backup failure alert could not update the existing issue." >&2
    exit 1
  fi
  echo "Backup failure alert recorded on the existing P0 issue."
else
  if ! gh issue create --repo "$GITHUB_REPOSITORY" --title "$ALERT_TITLE" \
    --label "$ALERT_LABEL" --body "$ALERT_BODY" >/dev/null 2>&1; then
    echo "Backup failure alert could not create the P0 issue." >&2
    exit 1
  fi
  echo "Backup failure P0 issue created."
fi
