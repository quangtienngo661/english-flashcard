#!/usr/bin/env bash
# Run an earlier API image again: deploy/scripts/rollback.sh <sha> (a prefix of 7+ characters is enough).
# Never migrates and never builds: migrations are add-only, so the earlier code runs on the newer database. Deploy runbook M4.
set -euo pipefail
# shellcheck source=deploy/scripts/common.sh
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

main() {
  local wanted="${1:?usage: rollback.sh <sha>}" matches tag
  [ "${#wanted}" -ge 7 ] || die "give at least 7 characters of the SHA"
  matches="$(docker image ls wordmet-api --format '{{.Tag}}' | grep "^$wanted" || true)"
  [ -n "$matches" ] || die "no image wordmet-api:$wanted* on this machine (deploy.sh keeps the 3 newest); rollback cannot build"
  [ "$(wc -l <<<"$matches")" -eq 1 ] || die "$wanted matches several images: $(tr '\n' ' ' <<<"$matches")"
  tag="$matches"

  log "start $tag (no migration)"
  API_TAG="$tag" compose up -d api worker
  if wait_ready 120; then
    record_running "$tag"
    log "rolled back to $tag"
    return 0
  fi
  log "ERROR: $tag is not ready after 120 s: compose logs api"
  return 1
}

main "$@"; exit $?
