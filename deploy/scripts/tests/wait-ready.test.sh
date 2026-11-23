#!/usr/bin/env bash
set -euo pipefail

TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "$TESTS_DIR/.." && pwd)"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/bin" "$tmp/home"
touch "$tmp/home/.env"
export WORDMET_HOME="$tmp/home"

cat > "$tmp/bin/docker" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = "compose" ]; then
  svc="${@: -1}"
  printf 'cid-%s\n' "$svc"
  exit 0
fi
if [ "$1" = "inspect" ]; then
  cid="${@: -1}"
  case "$cid" in
    cid-api)    printf '%s\n' "${STUB_API_HEALTH:-healthy}" ;;
    cid-worker) printf '%s\n' "${STUB_WORKER_HEALTH:-healthy}" ;;
    *)          printf 'missing\n' ;;
  esac
  exit 0
fi
exit 0
EOF
chmod +x "$tmp/bin/docker"

export PATH="$tmp/bin:$PATH"

# shellcheck source=deploy/scripts/common.sh
. "$SCRIPTS_DIR/common.sh"

# 1. api healthy, worker starting → wait_ready 2 returns 1
rc=0
STUB_API_HEALTH=healthy STUB_WORKER_HEALTH=starting wait_ready 2 || rc=$?
if [ "$rc" -ne 1 ]; then
  echo "FAIL case 1: expected wait_ready to return 1 when worker is starting, got $rc" >&2
  exit 1
fi

# 2. both healthy → wait_ready 2 returns 0
rc=0
STUB_API_HEALTH=healthy STUB_WORKER_HEALTH=healthy wait_ready 2 || rc=$?
if [ "$rc" -ne 0 ]; then
  echo "FAIL case 2: expected wait_ready to return 0 when both api and worker are healthy, got $rc" >&2
  exit 1
fi
