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
: > "$DELETES_LOG"

# shellcheck source=deploy/scripts/backup.sh
. "$SCRIPTS_DIR/backup.sh"

# Fix "now" to 2026-11-23T12:00:00Z (14 days ago = 2026-11-09).
CUTOFF_DATE="20261109"

# Override r2() to return deterministic listings and record deletes.
r2() {
  if [ "$1" = "s3" ] && [ "$2" = "ls" ]; then
    case "$3" in
      "s3://$R2_BACKUP_BUCKET/daily/")
        for d in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16; do
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
        # 20 days before 2026-11-23 → 2026-11-03 (must be deleted)
        printf '2026-11-03 02:00:00 1000 wordmet-20261103T020000Z.dump\n'
        # 3 days before 2026-11-23 → 2026-11-20 (must be kept)
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
s3://wordmet-backups/daily/wordmet-20261101T020000Z.dump
s3://wordmet-backups/daily/wordmet-20261102T020000Z.dump
s3://wordmet-backups/deploy/wordmet-20261110T030000Z.dump
s3://wordmet-backups/deploy/wordmet-20261111T030000Z.dump
s3://wordmet-backups/wordmet-20261103T020000Z.dump
EOF
)

got="$(cat "$DELETES_LOG")"
if [ "$got" != "$want" ]; then
  echo "FAIL backup-retention:" >&2
  echo "--- got ---" >&2
  printf '%s\n' "$got" >&2
  echo "--- want ---" >&2
  printf '%s\n' "$want" >&2
  exit 1
fi
