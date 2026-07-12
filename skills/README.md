# Fitness360 `dev` skill

Slash-command workflows (fw-dev-tools style). **User-facing commands are always `/dev-*` — never `npm run skill:*`.**

## Install

```bash
npx skills add gymkhana-fitness-360/gymkhana@dev -y
npx skills add . -s dev -y
```

## Slash commands

| Command | Purpose |
|---------|---------|
| `/dev-setup` | First-time local install |
| `/dev-debug` | Env / DB / port diagnostics |
| `/dev-validate` | Completion gates before PR |
| `/dev-validate --quick` | Mid-task gate |
| `/dev-fix` | Fix typecheck / lint / audits (≤6 iterations) |
| `/dev-learn` | Capture skill learnings |
| `/dev-new-api` | New API endpoint workflow |
| `/dev-new-dashboard` | New dashboard page workflow |

## Structure

```
skills/
  SKILL.md
  commands/          # /dev-* workflow definitions
  rules/               # constraints (+ business-rules.mdc)
  references/          # architecture, business-rules, UI, playbooks
  scripts/           # tsx implementations (agent-only)
  learnings/
```

Repo `npm` scripts (typecheck, lint, test) are invoked **by** `/dev-validate` — they are not skill commands.

Full index: `references/skill-advanced-topics.md`
