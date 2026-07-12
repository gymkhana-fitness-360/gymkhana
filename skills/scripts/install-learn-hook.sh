#!/usr/bin/env bash
# Install a post-commit hook that auto-runs skill learner on diffs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOOKS_DIR="$ROOT/skills/scripts/git-hooks"
mkdir -p "$HOOKS_DIR"

cat > "$HOOKS_DIR/post-commit" << 'HOOK'
#!/usr/bin/env bash
cd "$(git rev-parse --show-toplevel)" || exit 0
tsx skills/scripts/learner.ts auto --since HEAD~1 2>/dev/null || true
HOOK
chmod +x "$HOOKS_DIR/post-commit"

git -C "$ROOT" config core.hooksPath skills/scripts/git-hooks
echo "→ Installed post-commit learner hook at skills/scripts/git-hooks"
echo "  Uninstall: git config --unset core.hooksPath"
