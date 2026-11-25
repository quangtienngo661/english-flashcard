#!/usr/bin/env bash
set -euo pipefail

TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "$TESTS_DIR/.." && pwd)"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

export R2_BACKUP_BUCKET="wordmet-backups"
export R2_BACKUP_ENDPOINT="https://r2.example.test"
export R2_BACKUP_ACCESS_KEY_ID="k"
export R2_BACKUP_SECRET_ACCESS_KEY="s"
export DELETES_LOG="$tmp/deletes.log"
export EVENTS_LOG="$tmp/events.log"

# shellcheck source=deploy/scripts/backup.sh
. "$SCRIPTS_DIR/backup.sh"

# Fix "now" to 2026-11-23T12:00:00Z (14 days ago = 2026-11-09).
CUTOFF_DATE="20261109"
failed=0

# Case 1: 16 consecutive daily dumps (2026-11-07..22), 7 deploy dumps, 2 legacy root dumps.
# Deletes only the 2 oldest daily dumps (< 20261109), 2 oldest deploy dumps (keep 5), and 1 old root dump.
: > "$DELETES_LOG"
r2() {
  if [ "$1" = "s3" ] && [ "$2" = "ls" ]; then
    case "$3" in
      "s3://$R2_BACKUP_BUCKET/daily/")
        for d in 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22; do
          printf '2026-11-%s 02:00:00 1000 wordmet-202611%sT020000Z.dump\n' "$d" "$d"
        done
        ;;
      "s3://$R2_BACKUP_BUCKET/deploy/")
        for d in 10 11 12 13 14 15 16; do
          printf '2026-11-%s 03:00:00 1000 wordmet-202611%sT030000Z.dump\n' "$d" "$d"
        done
        ;;
      "s3://$R2_BACKUP_BUCKET/")
        printf '                           PRE daily/\n'
        printf '                           PRE deploy/\n'
        # 20 days before 2026-11-23 -> 2026-11-03 (must be deleted)
        printf '2026-11-03 02:00:00 1000 wordmet-20261103T020000Z.dump\n'
        # 3 days before 2026-11-23 -> 2026-11-20 (must be kept)
        printf '2026-11-20 02:00:00 1000 wordmet-20261120T020000Z.dump\n'
        ;;
    esac
    return 0
  fi
  if [ "$1" = "s3" ] && [ "$2" = "rm" ]; then
    printf '%s\n' "${@: -1}" >> "$DELETES_LOG"
    return 0
  fi
  echo "unexpected r2 call: $*" >&2
  return 1
}

prune_remote_dumps "$CUTOFF_DATE"

want=$(cat <<'EOF'
s3://wordmet-backups/daily/wordmet-20261107T020000Z.dump
s3://wordmet-backups/daily/wordmet-20261108T020000Z.dump
s3://wordmet-backups/deploy/wordmet-20261110T030000Z.dump
s3://wordmet-backups/deploy/wordmet-20261111T030000Z.dump
s3://wordmet-backups/wordmet-20261103T020000Z.dump
EOF
)

got="$(cat "$DELETES_LOG")"
if [ "$got" != "$want" ]; then
  echo "FAIL case 1 (baseline retention):" >&2
  echo "--- got ---" >&2
  printf '%s\n' "$got" >&2
  echo "--- want ---" >&2
  printf '%s\n' "$want" >&2
  failed=1
fi

# Case 2: 15 daily/ dumps on 14 distinct days (2026-11-10..23) plus one extra on 2026-11-23.
# R2 object lock rejects deletes for objects younger than 13 days (>= 20261110).
# Age-based daily pruning must not attempt to delete any of them and must exit 0.
: > "$DELETES_LOG"
r2() {
  local target base dump_date
  if [ "$1" = "s3" ] && [ "$2" = "ls" ]; then
    if [ "$3" = "s3://$R2_BACKUP_BUCKET/daily/" ]; then
      for d in 10 11 12 13 14 15 16 17 18 19 20 21 22 23; do
        printf '2026-11-%s 02:00:00 1000 wordmet-202611%sT020000Z.dump\n' "$d" "$d"
      done
      printf '2026-11-23 14:00:00 1000 wordmet-20261123T140000Z.dump\n'
    fi
    return 0
  fi
  if [ "$1" = "s3" ] && [ "$2" = "rm" ]; then
    target="${!#}"
    printf '%s\n' "$target" >> "$DELETES_LOG"
    base="${target##*/}"
    dump_date="${base#wordmet-}"
    dump_date="${dump_date:0:8}"
    if [ "$dump_date" -gt 20261109 ]; then
      echo "AccessDenied: Object locked ($target)" >&2
      return 1
    fi
    return 0
  fi
  echo "unexpected r2 call: $*" >&2
  return 1
}

set +e
(
  set -euo pipefail
  prune_remote_dumps "$CUTOFF_DATE"
)
rc=$?
set -e
got="$(cat "$DELETES_LOG")"
if [ "$rc" -ne 0 ] || [ -n "$got" ]; then
  echo "FAIL case 2 (extra daily dump with 13-day R2 lock): rc=$rc deletes='$got'" >&2
  failed=1
fi

# Case 3: main() runs WAL-G backup-push BEFORE prune_remote_dumps, tolerates r2 s3 rm failure,
# logs a WARNING, and exits 0.
mkdir -p "$tmp/home" "$tmp/scripts"
cat > "$tmp/scripts/send-alert.sh" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$tmp/scripts/send-alert.sh"

run_main_with_rm_failure() {
  local out_file="$1"
  : > "$EVENTS_LOG"
  (
    set -euo pipefail
    export WORDMET_HOME="$tmp/home"
    export SCRIPTS="$tmp/scripts"
    load_ops_env() { :; }
    env_get() {
      case "$1" in
        POSTGRES_USER) printf 'u' ;;
        POSTGRES_DB) printf 'd' ;;
      esac
    }
    ping_healthcheck() { printf 'ping %s\n' "$*" >> "$EVENTS_LOG"; }
    compose() {
      case "$*" in
        *pg_dump*)
          printf 'pg_dump\n' >> "$EVENTS_LOG"
          printf 'fake-dump-bytes\n'
          ;;
        *"wal-g backup-push"*)
          printf 'wal-g-backup-push\n' >> "$EVENTS_LOG"
          ;;
        *"wal-g delete retain"*)
          printf 'wal-g-delete-retain\n' >> "$EVENTS_LOG"
          ;;
        *)
          echo "unexpected compose call: $*" >&2
          return 1
          ;;
      esac
    }
    r2() {
      if [ "$1" = "s3" ] && [ "$2" = "cp" ]; then
        printf 'r2-cp %s\n' "${@: -1}" >> "$EVENTS_LOG"
        return 0
      fi
      if [ "$1" = "s3" ] && [ "$2" = "ls" ]; then
        if [ "$3" = "s3://$R2_BACKUP_BUCKET/daily/" ]; then
          printf '2020-01-01 02:00:00 1000 wordmet-20200101T020000Z.dump\n'
          for d in 10 11 12 13 14 15 16 17 18 19 20 21 22 23; do
            printf '2026-11-%s 02:00:00 1000 wordmet-202611%sT020000Z.dump\n' "$d" "$d"
          done
        fi
        return 0
      fi
      if [ "$1" = "s3" ] && [ "$2" = "rm" ]; then
        printf 'r2-rm %s\n' "${@: -1}" >> "$EVENTS_LOG"
        echo "AccessDenied: Object locked" >&2
        return 1
      fi
      echo "unexpected r2 call: $*" >&2
      return 1
    }
    main
  ) > "$out_file" 2>&1
}

set +e
run_main_with_rm_failure "$tmp/main.out"
rc=$?
set -e
if [ "$rc" -ne 0 ]; then
  echo "FAIL case 3 (main with failing r2 rm): expected exit 0, got $rc" >&2
  cat "$tmp/main.out" >&2
  failed=1
fi
if ! grep -qx 'wal-g-backup-push' "$EVENTS_LOG"; then
  echo "FAIL case 3: wal-g-backup-push was never reached" >&2
  cat "$EVENTS_LOG" >&2
  failed=1
fi
if ! grep -qx 'wal-g-delete-retain' "$EVENTS_LOG"; then
  echo "FAIL case 3: wal-g-delete-retain was never reached" >&2
  failed=1
fi
if ! grep -q '^r2-rm ' "$EVENTS_LOG"; then
  echo "FAIL case 3: prune_remote_dumps did not attempt r2 rm" >&2
  failed=1
else
  walg_line="$(grep -n '^wal-g-backup-push$' "$EVENTS_LOG" | head -n 1 | cut -d: -f1 || echo 9999)"
  rm_line="$(grep -n '^r2-rm ' "$EVENTS_LOG" | head -n 1 | cut -d: -f1 || echo 0)"
  if [ "$walg_line" -ge "$rm_line" ]; then
    echo "FAIL case 3: expected wal-g-backup-push (line $walg_line) before r2-rm (line $rm_line)" >&2
    cat "$EVENTS_LOG" >&2
    failed=1
  fi
fi
if ! grep -q 'WARNING: could not delete' "$tmp/main.out"; then
  echo "FAIL case 3: expected 'WARNING: could not delete' in output" >&2
  cat "$tmp/main.out" >&2
  failed=1
fi

# Case 4: BACKUP_SKIP_BASE=1 path still runs prune_remote_dumps, tolerates r2 s3 rm failure, and exits 0.
set +e
BACKUP_SKIP_BASE=1 BACKUP_KIND=deploy run_main_with_rm_failure "$tmp/skip.out"
rc=$?
set -e
if [ "$rc" -ne 0 ]; then
  echo "FAIL case 4 (BACKUP_SKIP_BASE=1 with failing r2 rm): expected exit 0, got $rc" >&2
  cat "$tmp/skip.out" >&2
  failed=1
fi
if grep -qx 'wal-g-backup-push' "$EVENTS_LOG"; then
  echo "FAIL case 4: wal-g-backup-push should not run when BACKUP_SKIP_BASE=1" >&2
  failed=1
fi
if ! grep -q '^r2-rm ' "$EVENTS_LOG"; then
  echo "FAIL case 4: prune_remote_dumps did not run on BACKUP_SKIP_BASE=1 path" >&2
  failed=1
fi
if ! grep -q 'WARNING: could not delete' "$tmp/skip.out"; then
  echo "FAIL case 4: expected 'WARNING: could not delete' in output" >&2
  cat "$tmp/skip.out" >&2
  failed=1
fi

exit "$failed"
