#!/usr/bin/env bash
# Every 5 minutes from cron: look at the last 5 minutes of the stack and email the owner when something is wrong. Deploy runbook M7.
# Each check is its own alert type, so send-alert.sh sends at most one email per check per hour.
# WATCH_DISK_PERCENT (default 80), WATCH_MEM_MB (default 300) and WATCH_ARCHIVE_MAX_AGE_S (default 900) change the thresholds.
set -euo pipefail
# shellcheck source=deploy/scripts/common.sh
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

SERVICES=(caddy api worker postgres redis)

main() {
  load_ops_env ALERT_RESEND_API_KEY ALERT_FROM ALERT_TO
  local spec name min count disk mem service id state broken="" restarts last age ready max_age free rc
  # Global, not local: the EXIT trap runs after main has returned.
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  # 1. Log events of the API and the worker.
  compose logs --since 5m --no-log-prefix api worker > "$tmp/logs" 2>&1 || true
  for spec in request_failed:5 maintenance_job_failed:1 account_deletion_failed:1 turnstile_bypassed:1 order_money_unapplied:1 billing_signature_invalid:1 order_provider_mismatch:1; do
    name="${spec%%:*}"
    min="${spec##*:}"
    count="$(grep -c "\"event\":\"$name\"" "$tmp/logs" || true)"
    if [ "$count" -ge "$min" ]; then
      { echo "$count × $name in the last 5 minutes (threshold $min)."; echo; echo "Last lines:"; grep "\"event\":\"$name\"" "$tmp/logs" | tail -n 20; } > "$tmp/body"
      alert "$name" "[wordmet] $count × $name in 5 minutes" "$tmp/body"
    fi
  done

  # 2. Disk and memory of the VPS.
  disk="$(df -P / | awk 'NR == 2 { gsub("%", "", $5); print $5 }')"
  if [ "$disk" -gt "${WATCH_DISK_PERCENT:-80}" ]; then
    df -h / > "$tmp/body"
    alert disk "[wordmet] disk ${disk}% used" "$tmp/body"
  fi
  mem="$(awk '/^MemAvailable:/ { print int($2 / 1024) }' /proc/meminfo)"
  if [ "$mem" -lt "${WATCH_MEM_MB:-300}" ]; then
    { echo "MemAvailable ${mem} MB (threshold ${WATCH_MEM_MB:-300} MB)."; echo; docker stats --no-stream 2>&1 || true; } > "$tmp/body"
    alert memory "[wordmet] only ${mem} MB of memory left" "$tmp/body"
  fi

  # 3. Every service runs and is not unhealthy.
  for service in "${SERVICES[@]}"; do
    id="$(compose ps -q "$service" 2>/dev/null || true)"
    if [ -z "$id" ]; then broken+="$service: no container"$'\n'; continue; fi
    state="$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$id")"
    case "$state" in
      running\ unhealthy | exited* | dead* | restarting* | created* | paused*) broken+="$service: $state"$'\n' ;;
    esac
  done
  if [ -n "$broken" ]; then
    { printf '%s\n' "$broken"; compose ps 2>&1 || true; } > "$tmp/body"
    alert services "[wordmet] a service is down or unhealthy" "$tmp/body"
  fi

  # 4. The api or worker restarted since the last run (Docker resets the count when deploy.sh creates a new container).
  mkdir -p "$STATE_DIR/restarts"
  : > "$tmp/body"
  for service in api worker; do
    id="$(compose ps -q "$service" 2>/dev/null || true)"
    [ -n "$id" ] || continue
    restarts="$(docker inspect -f '{{.RestartCount}}' "$id")"
    last="$(cat "$STATE_DIR/restarts/$service" 2>/dev/null || echo 0)"
    if [ "$restarts" -gt "$last" ]; then
      { echo "$service restarted $((restarts - last)) time(s) since the last check."; compose logs --tail 30 --no-log-prefix "$service" 2>&1 || true; echo; } >> "$tmp/body"
    fi
    echo "$restarts" > "$STATE_DIR/restarts/$service"
  done
  if [ -s "$tmp/body" ]; then alert restarts "[wordmet] the API or the worker restarted" "$tmp/body"; fi

  # 5. WAL reaches R2. If it stops, pg_wal grows until the disk is full and Postgres stops. The archiver retries on its own, so one slow
  # minute is not a problem: alert when the last file archived is older than WATCH_ARCHIVE_MAX_AGE_S (default 900) AND files are waiting,
  # or when more than 20 are waiting. Postgres being down is check 3's alert, not this one; archiving switched off or an unreadable
  # archive_status (archive_state status 2) is this one's.
  rc=0
  state="$(archive_state)" || rc=$?
  if [ "$rc" -eq 2 ]; then
    { echo "WAL archiving cannot be checked: $state."; echo; echo "Without archiving there is no point-in-time restore and nothing tells when it stopped."; } > "$tmp/body"
    alert archive "[wordmet] WAL archiving is off or unreadable" "$tmp/body"
  elif [ "$rc" -eq 0 ]; then
    read -r age ready <<< "$state"
    max_age="${WATCH_ARCHIVE_MAX_AGE_S:-900}"
    if { [ "$ready" -gt 0 ] && { [ "$age" -lt 0 ] || [ "$age" -gt "$max_age" ]; }; } || [ "$ready" -gt 20 ]; then
      {
        echo "WAL files are not reaching R2: $ready waiting in pg_wal/archive_status, last one archived ${age} s ago (-1 = never; threshold ${max_age} s, or more than 20 waiting)."
        echo
        compose exec -T postgres psql -X -x -U "$(env_get POSTGRES_USER)" -d "$(env_get POSTGRES_DB)" -c 'SELECT * FROM pg_stat_archiver' 2>&1 || true
        # Only archiver lines: other server log lines can hold query text or row data. wal-g's own retry lines ("Retrying S3 request...",
        # "caused by: Put .../wal_005/<file>") never say wal-g or archive, hence the extra words (seen with R2 down in the rehearsal).
        echo "Last archiver lines of the postgres log:"
        { compose logs --tail 300 --no-log-prefix postgres 2>&1 | grep -iE 'archive|wal-g|wal-push|wal_005|S3 request|^caused by' | tail -n 15; } || true
      } > "$tmp/body"
      alert archive "[wordmet] WAL archiving to R2 is behind ($ready waiting)" "$tmp/body"
    fi
  fi

  # 6. Free disk in GB. Postgres stops when the disk is full, so the two levels warn well before that.
  # -P keeps each filesystem on one line, so field 4 is always Available.
  free="$(df -P -BG / | awk 'NR == 2 { gsub("G", "", $4); print $4 }')"
  if ! [[ "$free" =~ ^[0-9]+$ ]]; then
    log "WARNING: could not read the free disk space in GB (got '${free}'), skipping the free-GB check"
  elif [ "$free" -lt 8 ]; then
    df -h / > "$tmp/body"
    alert disk-critical "[wordmet] only ${free} GB of disk left" "$tmp/body"
  elif [ "$free" -lt 15 ]; then
    df -h / > "$tmp/body"
    alert disk-low "[wordmet] only ${free} GB of disk left" "$tmp/body"
  fi

  # 7. Billing anomalies in Postgres: orders needing review or stuck failed billing_events (F-09; IDs and counts only, never PII).
  local nr_count fail_ev_count
  nr_count="$(compose exec -T postgres psql -X -A -t -U "$(env_get POSTGRES_USER)" -d "$(env_get POSTGRES_DB)" \
    -c "SELECT count(*) FROM billing_orders WHERE status = 'needs_review'" 2>/dev/null || true)"
  if [[ "$nr_count" =~ ^[0-9]+$ ]] && [ "$nr_count" -gt 0 ]; then
    {
      echo "$nr_count billing_orders row(s) currently in status = 'needs_review'."
      echo
      compose exec -T postgres psql -X -U "$(env_get POSTGRES_USER)" -d "$(env_get POSTGRES_DB)" \
        -c "SELECT id, review_reason, amount_minor, created_at FROM billing_orders WHERE status = 'needs_review' ORDER BY created_at DESC LIMIT 20" 2>&1 || true
    } > "$tmp/body"
    alert billing-needs-review "[wordmet] $nr_count billing order(s) need review" "$tmp/body"
  fi

  fail_ev_count="$(compose exec -T postgres psql -X -A -t -U "$(env_get POSTGRES_USER)" -d "$(env_get POSTGRES_DB)" \
    -c "SELECT count(*) FROM billing_events WHERE status = 'failed'" 2>/dev/null || true)"
  if [[ "$fail_ev_count" =~ ^[0-9]+$ ]] && [ "$fail_ev_count" -gt 0 ]; then
    {
      echo "$fail_ev_count billing_events row(s) currently in status = 'failed'."
      echo
      compose exec -T postgres psql -X -U "$(env_get POSTGRES_USER)" -d "$(env_get POSTGRES_DB)" \
        -c "SELECT id, provider, type, attempts, error, received_at FROM billing_events WHERE status = 'failed' ORDER BY received_at DESC LIMIT 20" 2>&1 || true
    } > "$tmp/body"
    alert billing-event-failed "[wordmet] $fail_ev_count failed billing event(s)" "$tmp/body"
  fi

  local ignored_sql="$REPO/deploy/sql/alerts/payments-ignored.sql"
  local ignored_count
  ignored_count="$(sed '/^-- detail/q' "$ignored_sql" | compose exec -T postgres psql -X -A -t -U "$(env_get POSTGRES_USER)" -d "$(env_get POSTGRES_DB)" -f - 2>/dev/null | tr -d '[:space:]' || true)"
  if [[ "$ignored_count" =~ ^[0-9]+$ ]] && [ "$ignored_count" -gt 0 ]; then
    {
      echo "$ignored_count ignored payment event(s) in the last 24 h (unknown-order or link-mismatch)."
      echo
      sed -n '/^-- detail/,$p' "$ignored_sql" | compose exec -T postgres psql -X -U "$(env_get POSTGRES_USER)" -d "$(env_get POSTGRES_DB)" -f - 2>&1 || true
    } > "$tmp/body"
    alert billing-payment-ignored "[wordmet] $ignored_count payment(s) ignored in 24 h (unknown order or link mismatch)" "$tmp/body"
  fi

  local flagged_sql="$REPO/deploy/sql/alerts/paid-with-review-reason.sql"
  local flagged_count
  flagged_count="$(sed '/^-- detail/q' "$flagged_sql" | compose exec -T postgres psql -X -A -t -U "$(env_get POSTGRES_USER)" -d "$(env_get POSTGRES_DB)" -f - 2>/dev/null | tr -d '[:space:]' || true)"
  if [[ "$flagged_count" =~ ^[0-9]+$ ]] && [ "$flagged_count" -gt 0 ]; then
    {
      echo "$flagged_count paid billing_orders row(s) flagged with a review_reason."
      echo
      sed -n '/^-- detail/,$p' "$flagged_sql" | compose exec -T postgres psql -X -U "$(env_get POSTGRES_USER)" -d "$(env_get POSTGRES_DB)" -f - 2>&1 || true
    } > "$tmp/body"
    alert billing-paid-flagged "[wordmet] $flagged_count paid order(s) flagged for review" "$tmp/body"
  fi

  # 8. Landing JSON-LD prices match live /v1/public/prices (exit 3 = mismatch, exit 4 = cannot check).
  local price_rc=0
  compose exec -T api node dist/cli/landing-prices-check.js > "$tmp/body" 2>&1 || price_rc=$?
  if [ "$price_rc" -eq 3 ]; then
    alert landing-price-mismatch "[wordmet] landing prices differ from the live prices: run the Deploy workflow" "$tmp/body"
  elif [ "$price_rc" -eq 4 ]; then
    log "landing-prices-check skipped (exit 4): $(tr '\n' ' ' < "$tmp/body")"
  elif [ "$price_rc" -ne 0 ]; then
    log "WARNING: landing-prices-check exited $price_rc"
  fi
}

alert() {
  "$SCRIPTS/send-alert.sh" "$1" "$2" "$3" || log "ERROR: could not send the $1 alert"
}

main "$@"; exit $?
