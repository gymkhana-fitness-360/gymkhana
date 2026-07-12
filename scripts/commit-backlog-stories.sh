#!/bin/bash
# Commits remaining backlog stories (run from repo root). Skips if nothing staged.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

commit() {
  local msg="$1"
  shift
  if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files -o --exclude-standard "$@")" ]; then
    echo "SKIP (no changes): $msg"
    return
  fi
  git add "$@"
  if git diff --cached --quiet; then
    echo "SKIP (empty): $msg"
    return
  fi
  git commit -m "$msg"
  echo "OK: $msg"
}

# CI
commit "ci(GYM-CI-002): Playwright smoke job in GitHub Actions" playwright.config.ts package.json
git add .github/workflows/ci.yml 2>/dev/null || true
# ci.yml committed in parts below
