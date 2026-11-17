#!/usr/bin/env bash
# 08:00 Asia/Ho_Chi_Minh from cron: one email with yesterday's totals (daily-report.sql), the 5xx count and p95 latency from the Caddy
# access log, disk and memory. Deploy runbook M7. CADDY_LOG_DIR (default /var/log/caddy) is where Caddy writes access.log.
set -euo pipefail
# shellcheck source=deploy/scripts/common.sh
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

main() {
  load_ops_env ALERT_RESEND_API_KEY ALERT_FROM ALERT_TO
  local day starts ends total errors p95 file
  # Global, not local: the EXIT trap runs after main has returned.
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  # The day and its start come from Postgres, like daily-report.sql, so a host without time zone data cannot disagree with the SQL.
  read -r day starts < <(compose exec -T postgres psql -X -A -t -F ' ' -U "$(env_get POSTGRES_USER)" -d "$(env_get POSTGRES_DB)" -c \
    "SELECT d, extract(epoch FROM d::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')::bigint FROM (SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 1 AS d) x")
  [ -n "$starts" ] || die "could not read the report day from Postgres"
  ends=$((starts + 86400))

  {
    echo "Wordmet, $day (Asia/Ho_Chi_Minh)"
    echo
    compose exec -T postgres psql -X -x -U "$(env_get POSTGRES_USER)" -d "$(env_get POSTGRES_DB)" \
      -v budget_key="$(env_get MAIL_BUDGET_KEY)" -f - < "$SCRIPTS/daily-report.sql"
    echo "mail budget per UTC day: $(env_get MAIL_DAILY_BUDGET)"
    echo
  } > "$tmp/body"

  # Caddy JSON access log: ts (unix seconds), status, duration (seconds). Rolled files may be gzipped.
  : > "$tmp/requests"
  for file in "${CADDY_LOG_DIR:-/var/log/caddy}"/access*.log*; do
    [ -f "$file" ] || continue
    case "$file" in *.gz) zcat "$file" ;; *) cat "$file" ;; esac
  done | jq -r --argjson s "$starts" --argjson e "$ends" 'select(.ts >= $s and .ts < $e) | "\(.status) \(.duration)"' \
    > "$tmp/requests" 2>/dev/null || true
  total="$(wc -l < "$tmp/requests" | tr -d ' ')"
  errors="$(awk '$1 >= 500' "$tmp/requests" | wc -l | tr -d ' ')"
  p95="$(awk '{ print $2 }' "$tmp/requests" | sort -g | awk '{ v[NR] = $1 } END { if (NR == 0) print "n/a"; else { i = int((NR * 95 + 99) / 100); printf "%.3f s", v[i] } }')"
  {
    echo "API requests: $total, 5xx: $errors, p95 latency: $p95"
    echo
    echo "Newest backup on this server: $(newest_backups 1)"
    echo
    pitr_line
    echo
    echo "Disk:"; df -h /
    echo
    echo "Memory:"; free -m 2>/dev/null || grep -E '^(MemTotal|MemAvailable):' /proc/meminfo
  } >> "$tmp/body"

  "$SCRIPTS/send-alert.sh" "daily-$day" "[wordmet] daily report $day" "$tmp/body"
}

# One line on point-in-time restore: how fresh the WAL on R2 is and the newest WAL-G base backup. A failure to read either prints
# `unavailable` for that part (R2 down, container down); it never stops the report.
pitr_line() {
  local state age ready wal="unavailable" base="unavailable" list newest
  if state="$(archive_state)"; then
    read -r age ready <<< "$state"
    if [ "$age" -lt 0 ]; then wal="never archived"; else wal="${age} s ago"; fi
    wal="last WAL $wal, .ready $ready"
  else
    wal="last WAL unavailable, .ready unavailable"
  fi
  # `wal-g backup-list` prints a header, then one backup per line, oldest first: name, modified time, first WAL segment.
  if list="$(compose exec -T -u postgres postgres timeout 60 wal-g backup-list 2>/dev/null)"; then
    newest="$(printf '%s\n' "$list" | awk '$1 ~ /^base_/ { name = $1; at = $2 } END { if (name != "") print name ", " at }')"
    base="${newest:-none}"
  fi
  if [ "$wal" = "last WAL unavailable, .ready unavailable" ] && [ "$base" = unavailable ]; then
    echo "PITR: unavailable"
  else
    echo "PITR: $wal, newest base backup $base"
  fi
}

main "$@"; exit $?
