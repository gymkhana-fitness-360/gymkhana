#!/usr/bin/env sh
set -e
cd "$(dirname "$0")/.."
git config core.hooksPath .githooks
chmod +x .githooks/pre-push 2>/dev/null || true
echo "Installed .githooks (pre-push blocks direct pushes to main)"
