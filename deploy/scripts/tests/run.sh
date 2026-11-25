#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
failed=0
count=0

for test_file in "$DIR"/*.test.sh; do
  [ -f "$test_file" ] || continue
  count=$((count + 1))
  printf 'RUN  %s\n' "$(basename "$test_file")"
  if bash "$test_file"; then
    printf 'PASS %s\n' "$(basename "$test_file")"
  else
    printf 'FAIL %s\n' "$(basename "$test_file")"
    failed=$((failed + 1))
  fi
done

if [ "$count" -eq 0 ]; then
  echo "No *.test.sh files found in $DIR" >&2
  exit 1
fi

if [ "$failed" -gt 0 ]; then
  echo "$failed of $count test file(s) failed" >&2
  exit 1
fi

echo "All $count test file(s) passed"
