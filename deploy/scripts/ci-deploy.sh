#!/usr/bin/env bash
# Forced command of the GitHub Actions deploy key (deploy/README.md "Continuous deployment"). The key's authorized_keys line runs this
# script and nothing else, whatever the client asked for; the client's request arrives in SSH_ORIGINAL_COMMAND and must be one full
# commit SHA. Installed outside the clone (/srv/wordmet/bin/ci-deploy.sh) because deploy.sh checks out other commits, which may not have
# this file. CI_DEPLOY_SCRIPT overrides the deploy script (tests only).
set -euo pipefail

sha="${SSH_ORIGINAL_COMMAND:-}"
if ! [[ "$sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "ci-deploy: expected one 40-character commit SHA" >&2
  exit 2
fi
export WORDMET_HOME="${WORDMET_HOME:-/srv/wordmet}"
exec "${CI_DEPLOY_SCRIPT:-$WORDMET_HOME/app/deploy/scripts/deploy.sh}" "$sha"
