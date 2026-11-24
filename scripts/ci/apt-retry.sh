#!/usr/bin/env bash
set -euo pipefail

if (($# < 1)); then
  echo "Usage: apt-retry.sh <update|install> [apt-get arguments...]" >&2
  exit 64
fi

operation="$1"
shift
case "$operation" in
  update|install) ;;
  *)
    echo "Unsupported apt-get operation: $operation" >&2
    exit 64
    ;;
esac

max_attempts="${APT_RETRY_MAX_ATTEMPTS:-3}"
base_delay="${APT_RETRY_BASE_DELAY_SECONDS:-10}"
[[ "$max_attempts" =~ ^[1-9][0-9]*$ ]] || { echo "APT_RETRY_MAX_ATTEMPTS must be a positive integer." >&2; exit 64; }
[[ "$base_delay" =~ ^[0-9]+$ ]] || { echo "APT_RETRY_BASE_DELAY_SECONDS must be a non-negative integer." >&2; exit 64; }

apt_options=(
  -o Acquire::Retries=2
  -o Acquire::http::Timeout=20
  -o Acquire::https::Timeout=20
)
if [[ "$operation" == "update" ]]; then
  # Do not accept a stale/partial package index as a successful refresh.
  apt_options+=(-o APT::Update::Error-Mode=any)
fi

for ((attempt = 1; attempt <= max_attempts; attempt++)); do
  echo "apt-get $operation attempt $attempt/$max_attempts"
  if sudo apt-get "${apt_options[@]}" "$operation" "$@"; then
    exit 0
  fi
  if ((attempt < max_attempts)); then
    delay=$((base_delay * attempt))
    echo "apt-get $operation failed; retrying in ${delay}s." >&2
    sleep "$delay"
  fi
done

echo "apt-get $operation failed after $max_attempts attempts; refusing to continue." >&2
exit 1
