#!/usr/bin/env bash
# `docker compose` on the production stack, with the right project, file and env file: deploy/scripts/compose.sh ps
set -euo pipefail
# shellcheck source=deploy/scripts/common.sh
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"
compose "$@"
