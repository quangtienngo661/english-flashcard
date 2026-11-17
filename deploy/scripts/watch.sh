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
  local spec name min count disk mem service id state broken="" restarts last age ready max_age free
  # Global, not local: the EXIT trap runs after main has returned.
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  # 1. Log events of the API and the worker.
  compose logs --since 5m --no-log-prefix api worker > "$tmp/logs" 2>&1 || true
  for spec in request_failed:5 maintenance_job_failed:1 account_deletion_failed:1 turnstile_bypassed:1; do
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
  # or when more than 20 are waiting. Postgres being down is check 3's alert, not this one.
  if state="$(archive_state)"; then
    read -r age ready <<< "$state"
    max_age="${WATCH_ARCHIVE_MAX_AGE_S:-900}"
    if { [ "$ready" -gt 0 ] && { [ "$age" -lt 0 ] || [ "$age" -gt "$max_age" ]; }; } || [ "$ready" -gt 20 ]; then
      {
        echo "WAL files are not reaching R2: $ready waiting in pg_wal/archive_status, last one archived ${age} s ago (-1 = never; threshold ${max_age} s, or more than 20 waiting)."
        echo
        compose exec -T postgres psql -X -x -U "$(env_get POSTGRES_USER)" -d "$(env_get POSTGRES_DB)" -c 'SELECT * FROM pg_stat_archiver' 2>&1 || true
        echo "Last lines of the postgres log:"
        compose logs --tail 15 --no-log-prefix postgres 2>&1 || true
      } > "$tmp/body"
      alert archive "[wordmet] WAL archiving to R2 is behind ($ready waiting)" "$tmp/body"
    fi
  fi

  # 6. Free disk in GB. Postgres stops when the disk is full, so the two levels warn well before that.
  free="$(df -BG / | awk 'NR == 2 { gsub("G", "", $4); print $4 }')"
  if [ "$free" -lt 8 ]; then
    df -h / > "$tmp/body"
    alert disk-critical "[wordmet] only ${free} GB of disk left" "$tmp/body"
  elif [ "$free" -lt 15 ]; then
    df -h / > "$tmp/body"
    alert disk-low "[wordmet] only ${free} GB of disk left" "$tmp/body"
  fi
}

alert() {
  "$SCRIPTS/send-alert.sh" "$1" "$2" "$3" || log "ERROR: could not send the $1 alert"
}

main "$@"; exit $?
