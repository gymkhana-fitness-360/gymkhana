#!/usr/bin/env bash
# Fitness360 local installer — thin wrapper around @fitness360/cli
# Usage: curl -fsSL https://raw.githubusercontent.com/fitness360/fitness360/main/scripts/install-local.sh | bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ is required. Install from https://nodejs.org"
  exit 1
fi

exec npx --yes @fitness360/cli@latest init "$@"
