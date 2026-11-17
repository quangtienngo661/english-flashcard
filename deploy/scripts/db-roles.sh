#!/usr/bin/env bash
# Creates or repairs the two database roles of the production stack (deploy/sql/roles.sql): wordmet_migrator (owns the schema, used
# only by the `migrate` service) and wordmet_app (rows only, used by the api, the worker and the CLIs). Runs as the bootstrap
# superuser POSTGRES_USER through the postgres container. Idempotent. Run it:
#   - once before the first deploy that uses the two roles,
#   - again after the first `migrate deploy` on an empty database (so _prisma_migrations is closed to the app role),
#   - after every restore (restored dumps lose the database-level grants) and when MIGRATOR_DB_PASSWORD / APP_DB_PASSWORD change.
# Prints exactly one line, `left over: N`, N being the objects in schema public the migrator does not own yet; N != 0 exits 1.
# The passwords go to psql through stdin and are never printed. Deploy runbook: deploy/README.md.
set -euo pipefail
# shellcheck source=deploy/scripts/common.sh
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

main() {
  local user db mig_pw app_pw out
  user="$(env_get POSTGRES_USER)"
  db="$(env_get POSTGRES_DB)"
  mig_pw="$(env_get MIGRATOR_DB_PASSWORD)"
  app_pw="$(env_get APP_DB_PASSWORD)"

  [ -n "$user" ] && [ -n "$db" ] || die "POSTGRES_USER and POSTGRES_DB must be set in $WORDMET_HOME/.env"
  [ -n "$mig_pw" ] && [ -n "$app_pw" ] || die "MIGRATOR_DB_PASSWORD and APP_DB_PASSWORD must be set in $WORDMET_HOME/.env"
  # roles.sql creates exactly these two logins; passwords set for other names would not be the ones the stack connects with.
  [ "$(env_get MIGRATOR_DB_USER)" = wordmet_migrator ] || die "MIGRATOR_DB_USER in .env must be wordmet_migrator (rolled back to the superuser? then do not run this script)"
  [ "$(env_get APP_DB_USER)" = wordmet_app ] || die "APP_DB_USER in .env must be wordmet_app (rolled back to the superuser? then do not run this script)"
  # The values become `\set` lines for psql: only URL-safe characters (the passwords are also written into DATABASE_URL unescaped).
  [[ "$db" =~ ^[A-Za-z0-9_]+$ ]] || die "POSTGRES_DB has characters outside A-Z a-z 0-9 _"
  [[ "$mig_pw" =~ ^[A-Za-z0-9._~-]+$ ]] || die "MIGRATOR_DB_PASSWORD has characters outside A-Z a-z 0-9 . _ ~ - (use node scripts/gen-secret.mjs)"
  [[ "$app_pw" =~ ^[A-Za-z0-9._~-]+$ ]] || die "APP_DB_PASSWORD has characters outside A-Z a-z 0-9 . _ ~ - (use node scripts/gen-secret.mjs)"

  # -q and -At: no command tags, only the value of the final SELECT.
  out="$({
    printf '\\set db %s\n\\set mig_pw %s\n\\set app_pw %s\n' "$db" "$mig_pw" "$app_pw"
    cat "$REPO/deploy/sql/roles.sql"
  } | compose exec -T postgres psql -X -q -At -U "$user" -d "$db" -v ON_ERROR_STOP=1)" || die "roles.sql failed (the passwords are not shown here)"

  [[ "$out" =~ ^left\ over:\ [0-9]+$ ]] || die "unexpected output from roles.sql: expected one line 'left over: N', got $(printf '%s' "$out" | wc -l) line(s)"
  printf '%s\n' "$out"
  [ "$out" = "left over: 0" ] || exit 1
}

main "$@"
