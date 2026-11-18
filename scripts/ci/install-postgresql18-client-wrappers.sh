#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required}"
command -v docker >/dev/null 2>&1 || { echo "Docker is required for the pinned PostgreSQL 18 client image." >&2; exit 2; }
docker image inspect postgres:18 >/dev/null 2>&1 || { echo "postgres:18 must already be present (the workflow service provides it)." >&2; exit 2; }

for tool in psql pg_dump pg_restore; do
  cat >"/tmp/${tool}-pg18-wrapper" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
tool="${0##*/}"
exec docker run --rm --network host --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$GITHUB_WORKSPACE:$GITHUB_WORKSPACE:ro" -v /tmp:/tmp \
  -w "$GITHUB_WORKSPACE" postgres:18 "$tool" "$@"
SH
  sudo install -m 0755 "/tmp/${tool}-pg18-wrapper" "/usr/local/bin/${tool}"
done

psql --version
pg_dump --version
pg_restore --version
