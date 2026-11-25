#!/usr/bin/env bash
set -euo pipefail

TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "$TESTS_DIR/.." && pwd)"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Build a temp bare origin repo with `main` (2 commits) and `side` (1 commit not on main).
git init --quiet --bare "$tmp/origin.git"
git -C "$tmp/origin.git" symbolic-ref HEAD refs/heads/main
git init --quiet "$tmp/work"
(
  cd "$tmp/work"
  git config user.email "test@example.test"
  git config user.name "Test"
  git checkout -q -b main
  mkdir -p deploy/scripts
  cp "$SCRIPTS_DIR/common.sh" "$SCRIPTS_DIR/deploy.sh" deploy/scripts/
  chmod +x deploy/scripts/deploy.sh
  git add .
  git commit -q -m "initial"
  git remote add origin "$tmp/origin.git"
  git push -q origin main

  # Commit 2 on main
  echo "v2" > version.txt
  git add version.txt
  git commit -q -m "v2"
  git push -q origin main

  # Side branch not on main
  git checkout -q -b side HEAD~1
  echo "side" > side.txt
  git add side.txt
  git commit -q -m "side commit"
  git push -q origin side
)

git clone --quiet "$tmp/origin.git" "$tmp/clone"
cp "$SCRIPTS_DIR/common.sh" "$SCRIPTS_DIR/deploy.sh" "$tmp/clone/deploy/scripts/"
chmod +x "$tmp/clone/deploy/scripts/deploy.sh"
(
  cd "$tmp/clone"
  git checkout --quiet --detach origin/main~1
  git add deploy/scripts/common.sh deploy/scripts/deploy.sh
  # Keep working tree clean by committing the scripts under test if changed, or stashing.
  if [ -n "$(git status --porcelain)" ]; then
    git config user.email "test@example.test"
    git config user.name "Test"
    git commit -q -m "sync scripts"
  fi
)

MAIN_V1="$(git -C "$tmp/origin.git" rev-parse main~1)"
MAIN_V2="$(git -C "$tmp/origin.git" rev-parse main)"
SIDE_SHA="$(git -C "$tmp/origin.git" rev-parse side)"

# Reset clone cleanly to MAIN_V1 so working tree is clean and HEAD == MAIN_V1.
git -C "$tmp/clone" checkout --quiet --detach "$MAIN_V1"

mkdir -p "$tmp/home/state" "$tmp/bin"
touch "$tmp/home/.env"
printf '%s\n' "$MAIN_V1" > "$tmp/home/state/current"

export WORDMET_HOME="$tmp/home"
export DEPLOY_SKIP_BACKUP=1
export WAIT_READY_TIMEOUT=2
export STUB_DOCKER_LOG="$tmp/docker.log"

cat > "$tmp/bin/docker" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$STUB_DOCKER_LOG"
if [ "$1" = "compose" ]; then
  if printf '%s\n' "$*" | grep -q " ps -q "; then
    printf 'cid-stub\n'
    exit 0
  fi
  exit 0
fi
if [ "$1" = "inspect" ]; then
  printf 'unhealthy\n'
  exit 0
fi
exit 0
EOF
chmod +x "$tmp/bin/docker"
export PATH="$tmp/bin:$PATH"

# Case 1: SHA only on side branch → exits non-zero and never calls compose up
: > "$STUB_DOCKER_LOG"
rc=0
"$tmp/clone/deploy/scripts/deploy.sh" "$SIDE_SHA" >/dev/null 2>&1 || rc=$?
if [ "$rc" -eq 0 ]; then
  echo "FAIL case 1: expected non-zero exit for non-main SHA" >&2
  exit 1
fi
if grep -q " up " "$STUB_DOCKER_LOG"; then
  echo "FAIL case 1: compose up was called for non-main SHA" >&2
  exit 1
fi

# Case 2: main SHA whose wait_ready fails → HEAD is restored to MAIN_V1
: > "$STUB_DOCKER_LOG"
rc=0
"$tmp/clone/deploy/scripts/deploy.sh" "$MAIN_V2" >/dev/null 2>&1 || rc=$?
if [ "$rc" -eq 0 ]; then
  echo "FAIL case 2: expected non-zero exit when wait_ready fails" >&2
  exit 1
fi
head_after="$(git -C "$tmp/clone" rev-parse HEAD)"
if [ "$head_after" != "$MAIN_V1" ]; then
  echo "FAIL case 2: expected HEAD=$MAIN_V1 after failure, got $head_after" >&2
  exit 1
fi
