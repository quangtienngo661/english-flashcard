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
    echo "Disk:"; df -h /
    echo
    echo "Memory:"; free -m 2>/dev/null || grep -E '^(MemTotal|MemAvailable):' /proc/meminfo
  } >> "$tmp/body"

  "$SCRIPTS/send-alert.sh" "daily-$day" "[wordmet] daily report $day" "$tmp/body"
}

main "$@"; exit $?
