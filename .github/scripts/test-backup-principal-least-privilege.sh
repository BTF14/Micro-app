#!/usr/bin/env bash
set -euo pipefail

container_id="${1:?Usage: test-backup-principal-least-privilege.sh <postgres-container-id>}"
dump_path="/tmp/backup-principal-contract.dump"
password="backup-contract-test-only"

cleanup() {
  docker exec "$container_id" rm -f "$dump_path" >/dev/null 2>&1 || true
  docker exec "$container_id" psql -v ON_ERROR_STOP=1 -U microapp -d microapp_test -c \
    "REVOKE CONNECT ON DATABASE microapp_test FROM backup_contract_test; DROP SCHEMA IF EXISTS backup_contract_fixture CASCADE; DROP ROLE IF EXISTS backup_contract_test;" \
    >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker exec -i "$container_id" psql -v ON_ERROR_STOP=1 -U microapp -d microapp_test -f /dev/stdin \
  < .github/scripts/test-backup-principal-least-privilege.sql

docker exec -e "PGPASSWORD=$password" "$container_id" pg_dump \
  -h 127.0.0.1 -U backup_contract_test -d microapp_test \
  --schema=backup_contract_fixture --format=custom --no-owner --no-acl --file="$dump_path"

docker exec "$container_id" pg_restore --list "$dump_path" >/dev/null

docker exec -e "PGPASSWORD=$password" "$container_id" psql \
  -h 127.0.0.1 -U backup_contract_test -d microapp_test -v ON_ERROR_STOP=1 \
  -c "SELECT count(*) FROM backup_contract_fixture.sample" >/dev/null

expect_denied() {
  local operation="$1"
  local sql="$2"
  if docker exec -e "PGPASSWORD=$password" "$container_id" psql \
    -h 127.0.0.1 -U backup_contract_test -d microapp_test -v ON_ERROR_STOP=1 \
    -c "$sql" >/dev/null 2>&1; then
    echo "Least-privilege backup role unexpectedly allowed: $operation" >&2
    exit 1
  fi
}

expect_denied "INSERT" "INSERT INTO backup_contract_fixture.sample (payload) VALUES ('forbidden')"
expect_denied "UPDATE" "UPDATE backup_contract_fixture.sample SET payload='forbidden'"
expect_denied "DELETE" "DELETE FROM backup_contract_fixture.sample"
expect_denied "CREATE DATABASE" "CREATE DATABASE backup_contract_forbidden"
expect_denied "CREATE ROLE" "CREATE ROLE backup_contract_forbidden"
expect_denied "SET ROLE" "SET ROLE microapp"

echo "PASS: least-privilege role can pg_dump/pg_restore-list, read fixture data, and cannot write or escalate."
