#!/usr/bin/env bash
# Email the owner through the Resend HTTP API: send-alert.sh <type> <subject> <body-file>. Deploy runbook M7.
# At most one email per <type> per hour (state/alerts/<type>); a non-2xx answer exits 1.
# ALERT_API_URL (optional, ops.env or shell) replaces the Resend address, for the local rehearsal only.
set -euo pipefail
# shellcheck source=deploy/scripts/common.sh
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

QUIET_SECONDS=3600

main() {
  local type="${1:?usage: send-alert.sh <type> <subject> <body-file>}" subject="${2:?}" body="${3:?}" stamp payload answer code
  load_ops_env ALERT_RESEND_API_KEY ALERT_FROM ALERT_TO
  [ -f "$body" ] || die "no body file $body"
  stamp="$STATE_DIR/alerts/$type"
  mkdir -p "$STATE_DIR/alerts"
  if [ -f "$stamp" ] && [ $(($(date +%s) - $(stat -c %Y "$stamp"))) -lt "$QUIET_SECONDS" ]; then
    log "alert $type: one was sent less than an hour ago, not sent again"
    return 0
  fi

  payload="$(jq -n --arg from "$ALERT_FROM" --arg to "$ALERT_TO" --arg subject "$subject" --rawfile text "$body" \
    '{from: $from, to: [$to], subject: $subject, text: $text}')"
  answer="$(mktemp)"
  code="$(curl -sS -o "$answer" -w '%{http_code}' -X POST "${ALERT_API_URL:-https://api.resend.com/emails}" \
    -H "Authorization: Bearer $ALERT_RESEND_API_KEY" -H 'Content-Type: application/json' --data-binary "$payload" || echo 000)"
  if [ "${code:0:1}" != 2 ]; then
    log "ERROR: alert $type not sent: HTTP $code $(head -c 300 "$answer")" >&2
    rm -f "$answer"
    return 1
  fi
  rm -f "$answer"
  touch "$stamp"
  log "alert $type sent: $subject"
}

main "$@"; exit $?
