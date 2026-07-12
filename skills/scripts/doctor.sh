#!/usr/bin/env bash
# Run Fitness360 CLI doctor from repo root (works when skill is installed from clone).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
exec node packages/cli/bin/fitness360.js doctor "$@"
