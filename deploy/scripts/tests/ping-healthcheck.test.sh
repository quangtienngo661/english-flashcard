#!/usr/bin/env bash
set -euo pipefail

TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "$TESTS_DIR/.." && pwd)"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/bin"
cat > "$tmp/bin/curl" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$STUB_CURL_LOG"
exit "${STUB_CURL_EXIT:-0}"
EOF
chmod +x "$tmp/bin/curl"

export PATH="$tmp/bin:$PATH"
export STUB_CURL_LOG="$tmp/curl.log"

# shellcheck source=deploy/scripts/common.sh
. "$SCRIPTS_DIR/common.sh"

# 1. Success ping
: > "$STUB_CURL_LOG"
STUB_CURL_EXIT=0 ping_healthcheck "https://hc.example.test/abc"
got="$(cat "$STUB_CURL_LOG")"
want="-fsS -m 10 --retry 3 -o /dev/null https://hc.example.test/abc"
if [ "$got" != "$want" ]; then
  echo "FAIL case 1: got '$got', want '$want'" >&2
  exit 1
fi

# 2. Failure ping
: > "$STUB_CURL_LOG"
STUB_CURL_EXIT=0 ping_healthcheck "https://hc.example.test/abc" fail
got="$(cat "$STUB_CURL_LOG")"
want="-fsS -m 10 --retry 3 -o /dev/null https://hc.example.test/abc/fail"
if [ "$got" != "$want" ]; then
  echo "FAIL case 2: got '$got', want '$want'" >&2
  exit 1
fi

# 3. Empty URL → no call
: > "$STUB_CURL_LOG"
STUB_CURL_EXIT=0 ping_healthcheck ""
if [ -s "$STUB_CURL_LOG" ]; then
  echo "FAIL case 3: expected empty log, got '$(cat "$STUB_CURL_LOG")'" >&2
  exit 1
fi

# 4. curl exits 7 → ping_healthcheck still returns 0
: > "$STUB_CURL_LOG"
rc=0
STUB_CURL_EXIT=7 ping_healthcheck "https://hc.example.test/abc" >/dev/null 2>&1 || rc=$?
if [ "$rc" -ne 0 ]; then
  echo "FAIL case 4: expected exit 0, got $rc" >&2
  exit 1
fi
