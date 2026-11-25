#!/usr/bin/env bash
# Dump the production database and upload it to R2 (bucket wordmet-backups). Keeps 14 days of daily copies and 5 deploy copies on R2, and 3 on the VPS.
# Then a WAL-G base backup (to the WAL-G bucket of walg.env), keeping the 14 newest; skipped when BACKUP_SKIP_BASE=1.
# Daily by cron (dump and base backup) and before every deploy (deploy.sh: dump only). Deploy runbook M4; restore steps in deploy/README.md.
set -euo pipefail
# shellcheck source=deploy/scripts/common.sh
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

KEEP_REMOTE_DAILY=14
KEEP_REMOTE_DEPLOY=5
KEEP_LOCAL=3
KEEP_BASE=14 # WAL-G base backups kept on R2 (restore-safety Q1)
AWS_CLI_IMAGE=amazon/aws-cli:2.40.2

# The AWS CLI in a container, pointed at R2. R2 does not take the extra checksum headers newer AWS clients add by default.
r2() {
  docker run --rm \
    -e AWS_ACCESS_KEY_ID="$R2_BACKUP_ACCESS_KEY_ID" -e AWS_SECRET_ACCESS_KEY="$R2_BACKUP_SECRET_ACCESS_KEY" -e AWS_DEFAULT_REGION=auto \
    -e AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED -e AWS_RESPONSE_CHECKSUM_VALIDATION=WHEN_REQUIRED \
    -v "$BACKUP_DIR:/backups:ro" "$AWS_CLI_IMAGE" --endpoint-url "$R2_BACKUP_ENDPOINT" "$@"
}

# Any failure emails the owner (alert type `backup`): from cron nobody reads the output.
# shellcheck disable=SC2329 # called by the EXIT trap
alert_on_failure() {
  local status=$? body
  [ "$status" -eq 0 ] && return 0
  if [ "${BACKUP_KIND:-daily}" = daily ]; then
    ping_healthcheck "${HEALTHCHECK_BACKUP_URL:-}" fail
  fi
  body="$(mktemp)"
  { echo "backup.sh failed (exit $status) at $(date -u +%Y-%m-%dT%H:%M:%SZ) on $(hostname)."; echo "Last backups kept on this server:"; newest_backups 3; } > "$body"
  "$SCRIPTS/send-alert.sh" backup "[wordmet] backup failed" "$body" || log "ERROR: could not send the backup alert"
  rm -f "$body"
  return "$status"
}

# Prunes remote dumps in daily/ (older than cutoff_date), deploy/ (keep KEEP_REMOTE_DEPLOY),
# and legacy root-level wordmet-*.dump older than cutoff_date (YYYYMMDD, default KEEP_REMOTE_DAILY days ago UTC).
# Failed deletes are logged as warnings and do not abort the backup run (e.g. R2 object lock).
prune_remote_dumps() {
  local cutoff="${1:-$(date -u -d "$KEEP_REMOTE_DAILY days ago" +%Y%m%d)}" old dump_date
  for old in $(r2 s3 ls "s3://$R2_BACKUP_BUCKET/daily/" | awk '{print $4}' | grep -E '^wordmet-[0-9]{8}T[0-9]{6}Z\.dump$' | sort); do
    dump_date="${old#wordmet-}"
    dump_date="${dump_date:0:8}"
    if [[ "$dump_date" < "$cutoff" ]]; then
      if r2 s3 rm --only-show-errors "s3://$R2_BACKUP_BUCKET/daily/$old"; then
        log "removed old daily copy $old from R2"
      else
        log "WARNING: could not delete daily/$old"
      fi
    fi
  done
  for old in $(r2 s3 ls "s3://$R2_BACKUP_BUCKET/deploy/" | awk '{print $4}' | grep -E '^wordmet-[0-9TZ]+\.dump$' | sort | head -n "-$KEEP_REMOTE_DEPLOY"); do
    if r2 s3 rm --only-show-errors "s3://$R2_BACKUP_BUCKET/deploy/$old"; then
      log "removed old deploy copy $old from R2"
    else
      log "WARNING: could not delete deploy/$old"
    fi
  done
  for old in $(r2 s3 ls "s3://$R2_BACKUP_BUCKET/" | awk '{print $4}' | grep -E '^wordmet-[0-9]{8}T[0-9]{6}Z\.dump$' | sort); do
    dump_date="${old#wordmet-}"
    dump_date="${dump_date:0:8}"
    if [[ "$dump_date" < "$cutoff" ]]; then
      if r2 s3 rm --only-show-errors "s3://$R2_BACKUP_BUCKET/$old"; then
        log "removed legacy root copy $old from R2"
      else
        log "WARNING: could not delete $old"
      fi
    fi
  done
}

main() {
  trap alert_on_failure EXIT
  load_ops_env R2_BACKUP_ENDPOINT R2_BACKUP_BUCKET R2_BACKUP_ACCESS_KEY_ID R2_BACKUP_SECRET_ACCESS_KEY
  BACKUP_DIR="$WORDMET_HOME/backups"
  mkdir -p "$BACKUP_DIR"
  local user db name file old kind
  kind="${BACKUP_KIND:-daily}"
  case "$kind" in
    daily | deploy) ;;
    *) die "invalid BACKUP_KIND='$kind' (expected daily or deploy)" ;;
  esac
  user="$(env_get POSTGRES_USER)"
  db="$(env_get POSTGRES_DB)"
  name="wordmet-$(date -u +%Y%m%dT%H%M%SZ).dump"
  file="$BACKUP_DIR/$name"

  log "dump $db"
  compose exec -T postgres pg_dump -U "$user" -Fc "$db" > "$file" || { rm -f "$file"; die "pg_dump failed"; }
  [ -s "$file" ] || { rm -f "$file"; die "pg_dump wrote an empty file"; }

  log "upload $kind/$name ($(du -h "$file" | cut -f1))"
  r2 s3 cp --only-show-errors "/backups/$name" "s3://$R2_BACKUP_BUCKET/$kind/$name"

  find "$BACKUP_DIR" -maxdepth 1 -name 'wordmet-*.dump' -printf '%f\n' | sort | head -n "-$KEEP_LOCAL" | while read -r old; do
    rm -f "$BACKUP_DIR/$old"
  done

  log "uploaded s3://$R2_BACKUP_BUCKET/$kind/$name"

  # The WAL-G base backup runs from cron only: deploy.sh sets BACKUP_SKIP_BASE=1, so a WAL-G problem cannot block a deploy and a deploy
  # adds no base backup (owner, 18/11/2026). `retain FULL 14` counts base backups, so with one cron backup a day it keeps 14 days.
  if [ "${BACKUP_SKIP_BASE:-}" = 1 ]; then
    log "wal-g base backup skipped (BACKUP_SKIP_BASE=1)"
    prune_remote_dumps
    if [ "$kind" = daily ]; then
      ping_healthcheck "${HEALTHCHECK_BACKUP_URL:-}"
    fi
    return 0
  fi
  # The dump above is already safe on R2, so a WAL-G failure here still leaves one restorable copy; the failure alerts like any other.
  # A base backup plus the WAL archived since is what point-in-time restore starts from (restore-safety design 3.1).
  log "wal-g base backup"
  # backup-push connects to Postgres: PGUSER comes from the compose file, but with no PGDATABASE libpq looks for a database named
  # like the user, which this cluster does not have (found in the rehearsal), so the database is passed here.
  compose exec -T -u postgres -e PGDATABASE="$db" postgres sh -c 'exec wal-g backup-push "$PGDATA"' || die "wal-g backup-push failed"
  compose exec -T -u postgres postgres wal-g delete retain FULL "$KEEP_BASE" --confirm || die "wal-g delete retain failed"
  log "wal-g base backup done (newest $KEEP_BASE kept)"
  prune_remote_dumps
  if [ "$kind" = daily ]; then
    ping_healthcheck "${HEALTHCHECK_BACKUP_URL:-}"
  fi
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"; exit $?
fi
