#!/usr/bin/env bash
# Deploy the API and worker at <sha>: build images → backup → migrate → start → wait for /v1/health/ready → on failure, put the previous
# version back. Run on the VPS from the repo clone: deploy/scripts/deploy.sh <sha>. Deploy runbook M4; deploy/README.md.
# DEPLOY_SKIP_BACKUP=1 skips the backup (local rehearsal only: it has no R2).
set -euo pipefail
# shellcheck source=deploy/scripts/common.sh
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

KEEP_IMAGES=3

main() {
  local wanted="${1:?usage: deploy.sh <sha>}" sha current
  cd "$REPO"
  [ -z "$(git status --porcelain)" ] || die "the checkout in $REPO has local changes; deploy only committed code"

  log "fetch and check out $wanted"
  git fetch --quiet origin
  git checkout --quiet --detach "$wanted"
  sha="$(git rev-parse HEAD)"
  current="$(current_sha)"

  log "build wordmet-api:$sha and wordmet-api-migrate:$sha"
  docker build --quiet --target api-prod -t "wordmet-api:$sha" . >/dev/null
  docker build --quiet --target api-build -t "wordmet-api-migrate:$sha" . >/dev/null

  if [ -z "$current" ]; then
    log "first deploy: no backup (no database yet)"
  elif [ "${DEPLOY_SKIP_BACKUP:-}" = 1 ]; then
    log "WARNING: DEPLOY_SKIP_BACKUP=1, no backup taken"
  else
    "$SCRIPTS/backup.sh" || die "backup failed; nothing was changed, $current still runs"
  fi

  log "migrate"
  API_TAG="$sha" compose --profile migrate run --rm migrate \
    || die "migration failed; ${current:-nothing} still runs (an add-only migration that half-applied is safe for it)"

  log "start $sha"
  API_TAG="$sha" compose up -d --remove-orphans postgres redis api worker caddy

  if wait_ready 120; then
    record_running "$sha"
    prune_images
    log "deployed $sha (previous: ${current:-none})"
    return 0
  fi

  if [ -z "$current" ]; then
    log "the API is not ready after 120 s and there is no previous version to return to; containers left up for: compose logs api"
    return 1
  fi
  log "the API is not ready after 120 s: putting $current back"
  API_TAG="$current" compose up -d api worker
  if wait_ready 120; then log "$current runs again; $sha was not recorded"; else log "ERROR: $current is not ready either"; fi
  return 1
}

# Keeps the KEEP_IMAGES newest SHAs of each image, and always the running and previous ones.
prune_images() {
  local keep current previous tag
  current="$(current_sha)"
  previous="$(previous_sha)"
  keep="$(docker image ls wordmet-api --format '{{.CreatedAt}}\t{{.Tag}}' | sort -r | head -n "$KEEP_IMAGES" | cut -f2)"
  for tag in $(docker image ls wordmet-api --format '{{.Tag}}'); do
    if grep -qx "$tag" <<<"$keep" || [ "$tag" = "$current" ] || [ "$tag" = "$previous" ]; then continue; fi
    docker image rm "wordmet-api:$tag" "wordmet-api-migrate:$tag" >/dev/null 2>&1 || true
  done
}

# The whole script is read before main runs, so checking out another commit cannot change the running script under bash.
main "$@"; exit $?
