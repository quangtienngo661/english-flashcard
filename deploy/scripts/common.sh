#!/usr/bin/env bash
# Shared by every script in deploy/scripts (sourced, not run). Deploy runbook M4.
set -euo pipefail

export WORDMET_HOME="${WORDMET_HOME:-/srv/wordmet}"
SCRIPTS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# `pwd -W` exists only in Git Bash: there it gives the Windows path the Windows docker CLI understands (local rehearsal). On Linux it
# fails and plain `pwd` is used.
REPO="$(cd "$SCRIPTS/../.." && { pwd -W 2>/dev/null || pwd; })"
STATE_DIR="$WORDMET_HOME/state"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
die() { log "ERROR: $*" >&2; exit 1; }

# The one way to reach the production stack. API_TAG defaults to the running version so commands that do not deploy
# (backup, exec, logs) still satisfy the compose file.
compose() {
  local tag="${API_TAG:-$(current_sha)}"
  [ -f "$WORDMET_HOME/.env" ] || die "missing $WORDMET_HOME/.env (copy deploy/env.production.example)"
  API_TAG="${tag:-none}" docker compose -p wordmet -f "$REPO/deploy/compose.prod.yml" --env-file "$WORDMET_HOME/.env" "$@"
}

# One value of $WORDMET_HOME/.env, without sourcing the file (values may hold spaces and <>).
env_get() {
  local line
  line="$(grep -E "^$1=" "$WORDMET_HOME/.env" | tail -n 1 || true)"
  printf '%s' "${line#*=}"
}

# Loads $WORDMET_HOME/ops.env and stops with the name of every listed key that is missing or empty.
load_ops_env() {
  local file="$WORDMET_HOME/ops.env" missing=() key
  local line name
  [ -f "$file" ] || die "missing $file (copy deploy/ops.env.example)"
  # Read KEY=value lines as plain text: values such as `Wordmet ops <ops@wordmet.com>` are not shell syntax, so the file is not sourced.
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    case "$line" in '' | '#'*) continue ;; esac
    name="${line%%=*}"
    [[ "$name" =~ ^[A-Z_][A-Z0-9_]*$ ]] || continue
    export "$name=${line#*=}"
  done < "$file"
  for key in "$@"; do
    [ -n "${!key:-}" ] || missing+=("$key")
  done
  [ "${#missing[@]}" -eq 0 ] || die "ops.env is missing: ${missing[*]}"
}

current_sha() { cat "$STATE_DIR/current" 2>/dev/null || true; }
previous_sha() { cat "$STATE_DIR/previous" 2>/dev/null || true; }

# Records <sha> as running; the version it replaces becomes the previous one.
record_running() {
  local old
  mkdir -p "$STATE_DIR"
  old="$(current_sha)"
  if [ -n "$old" ] && [ "$old" != "$1" ]; then printf '%s\n' "$old" > "$STATE_DIR/previous"; fi
  printf '%s\n' "$1" > "$STATE_DIR/current"
}

# Waits until the api container reports healthy (its healthcheck calls /v1/health/ready). 0 = healthy, 1 = not within <seconds>.
wait_ready() {
  local deadline=$((SECONDS + $1)) id status
  while [ "$SECONDS" -lt "$deadline" ]; do
    id="$(compose ps -q api 2>/dev/null || true)"
    if [ -n "$id" ]; then
      status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id" 2>/dev/null || echo missing)"
      if [ "$status" = healthy ]; then return 0; fi
    fi
    sleep 3
  done
  return 1
}

# Names of the <n> newest database dumps in $WORDMET_HOME/backups, newest first (empty when there are none).
newest_backups() {
  find "$WORDMET_HOME/backups" -maxdepth 1 -name 'wordmet-*.dump' -printf '%T@ %f\n' 2>/dev/null | sort -rn | head -n "$1" | cut -d' ' -f2
}

# The full SHA to deploy for <ref> (run after `git fetch origin`): a hex SHA is taken as is; a branch name means the branch on origin,
# never the clone's local branch, which `git fetch` does not move.
resolve_commit() {
  if [[ "$1" =~ ^[0-9a-f]{7,40}$ ]]; then
    git rev-parse --verify --quiet "$1^{commit}" || die "commit $1 not found"
  else
    git rev-parse --verify --quiet "origin/$1^{commit}" || die "origin/$1 not found"
  fi
}
