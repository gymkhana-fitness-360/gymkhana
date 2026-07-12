---
name: dev
version: "1.0.0"
description: >-
  Self-hosted Fitness360 enforcement skill — slash commands /dev-setup, /dev-fix, /dev-validate,
  /dev-debug, /dev-learn, /dev-new-api, /dev-new-dashboard. Product/self-host only.
compatibility: "Node >= 20.9, PostgreSQL, Fitness360 repo (package.json name: fitness360)"
argument-hint: "[dev-setup|dev-fix|dev-validate|dev-debug|dev-learn|dev-new-api|dev-new-dashboard]"
allowed-tools: "shell read write strreplace glob grep"
---

# Fitness360 developer skill

Enforcement layer for engineers who **self-host, run locally, and extend the gym management app**.

**Out of scope:** marketing site and playground (**gymkhana-cloud** private repo → `www.gymkhana.fit`), cloud control-plane backlog.

---

## EXECUTION ORDER

1. **Open this file** for any Fitness360 build, fix, API, dashboard, or debug task
2. Run **prerequisites check** — STOP if any gate fails
3. Route to the right **slash command** workflow
4. Run **`/dev-validate`** before claiming complete
5. If you deviated from skill guidance → **`/dev-learn`**

**Skill commands are slash commands only** — never expose `npm run skill:*` to the user.

---

## Slash commands

| Command | When |
|---------|------|
| `/dev-setup` | First-time local install |
| `/dev-debug` | Env / DB / port diagnostics |
| `/dev-validate` | Pre-PR completion gates |
| `/dev-validate --quick` | Mid-task gate |
| `/dev-fix` | Typecheck / lint / audit failures |
| `/dev-learn` | Capture skill vs implementation divergences |
| `/dev-new-api` | New API endpoint |
| `/dev-new-dashboard` | New dashboard page |

Workflow files: `commands/<name>.md` (e.g. `commands/dev-fix.md` content in `fix.md` with `name: dev-fix` frontmatter).

---

## MANDATORY: Prerequisites — FIRST ACTION

Full logic: [rules/prerequisites-check.mdc](rules/prerequisites-check.mdc)

```bash
node -p "require('./package.json').name"   # → fitness360
node --version                               # → >= v20.9
test -f .env
```

Then `/dev-debug` if env exists.

| Condition | Action |
|-----------|--------|
| Not in Fitness360 repo | STOP → `/dev-setup` |
| Node < 20.9 | STOP → nvm use 20 |
| `.env` missing | STOP → `/dev-setup` |
| Debug failures | STOP → fix before coding |

---

## Completion gates — ZERO TOLERANCE

**Never complete a task until `/dev-validate` passes.**

| Gate | Slash / script |
|------|----------------|
| Environment | `/dev-debug` |
| All automated gates | `/dev-validate` |
| Failures | `/dev-fix` (max 6 iterations) |

Details: [commands/validate.md](commands/validate.md) · [commands/fix.md](commands/fix.md)

---

## Pre-write checklist

1. Business logic in `src/domains/<name>/handlers/` — not in `route.ts`
2. Mutating API → Zod + `parseJsonBody` + rate limit + auth
3. Tenant scope on every query (`accountId` / `gymId`)
4. Dashboard UI → shadcn + semantic tokens
5. Money → `formatCurrency()` (₹) in product
6. Business writes → `crud-business-validation.ts` + domain `rules.ts` constants
7. Schema change → Prisma migration (never `db push` in prod)
8. Deviated? → `/dev-learn capture …`
9. Ops feature (cron, undo, admin task, campaign)? → [rules/operations.mdc](rules/operations.mdc) or [rules/comms-ops.mdc](rules/comms-ops.mdc) + matching playbook

---

## Forbidden patterns

| Forbidden | Required |
|-----------|----------|
| Prisma in API routes | Domain handlers |
| Mutating route without Zod | `parseJsonBody` + schema |
| Unscoped tenant queries | `accountId` / `gymId` |
| Inlined payment limits (100, 50000) | `PAYMENT_RULES` + validators |
| `bg-gray-*` in dashboard | Semantic tokens |
| OpenWA in UI | Meta WABA only |

Full list: [references/tests/refusal.json](references/tests/refusal.json)

---

## Rules (always-on)

| Area | File |
|------|------|
| Prerequisites | [rules/prerequisites-check.mdc](rules/prerequisites-check.mdc) |
| API routes | [rules/api-routes.mdc](rules/api-routes.mdc) |
| Tenant scope | [rules/tenant-scope.mdc](rules/tenant-scope.mdc) |
| UI kit | [rules/ui-kit.mdc](rules/ui-kit.mdc) |
| Security | [rules/security.mdc](rules/security.mdc) |
| Business rules | [rules/business-rules.mdc](rules/business-rules.mdc) |
| Operations (crons, undo, admin tasks) | [rules/operations.mdc](rules/operations.mdc) |
| Comms (campaigns, WA history) | [rules/comms-ops.mdc](rules/comms-ops.mdc) |
| Validate/fix loop | [rules/validation-workflow.mdc](rules/validation-workflow.mdc) |

---

## Task → slash command + reads

| Task | Command + reads |
|------|-----------------|
| Local setup | `/dev-setup` |
| New API | `/dev-new-api` → api-routes + tenant-scope + **business-rules** |
| New dashboard | `/dev-new-dashboard` → ui-kit + `learnings/LEARNINGS.md` |
| Payment / member writes | [references/business-rules.md](references/business-rules.md) + `crud-business-validation.ts` |
| Cron / Inngest / daily stats | [rules/operations.mdc](rules/operations.mdc) → [playbooks/cron-and-background.md](references/playbooks/cron-and-background.md) |
| Admin undo / payment delete | [playbooks/undo-destructive-action.md](references/playbooks/undo-destructive-action.md) |
| Admin dry-run fix API | [playbooks/admin-maintenance-api.md](references/playbooks/admin-maintenance-api.md) |
| Attendance bootstrap / call-list | [playbooks/attendance-bootstrap.md](references/playbooks/attendance-bootstrap.md) |
| WhatsApp campaign | [playbooks/whatsapp-campaign.md](references/playbooks/whatsapp-campaign.md) + [rules/comms-ops.mdc](rules/comms-ops.mdc) |
| Mobile / PWA / staff preview | [playbooks/mobile-staff-shell.md](references/playbooks/mobile-staff-shell.md) |
| Fix CI | `/dev-fix` → validation-workflow rule |
| Done / PR | `/dev-validate` |
| Deep reference | [references/skill-advanced-topics.md](references/skill-advanced-topics.md) |

---

## Business rules (summary)

Gym-specific constants and write gates — **not optional** for payments, members, walk-ins, status.

| Area | Key rules |
|------|-----------|
| Payments | ₹100–₹50,000; IST calendar dates; dedupe ±₹2; split-payment detection |
| Membership | 30/90/180/365 day durations; 3-day grace; renew from `endDate` |
| Status | `ACTIVE ↔ EXPIRED` only; audit on `EXPIRED→ACTIVE` |
| Walk-in | Free trial max 2 lifetime; day pass ₹1–₹50k |
| Dates | IST (`Asia/Kolkata`); date-only in UI; `@db.Date` normalization |

**Enforcement:** [rules/business-rules.mdc](rules/business-rules.mdc) · **Full tables:** [references/business-rules.md](references/business-rules.md)

---

## Scripts (agent executes — not user-facing commands)

| Script | Invoked by |
|--------|------------|
| `tsx skills/scripts/debug.ts` | `/dev-debug` |
| `tsx skills/scripts/validate.ts` | `/dev-validate` |
| `tsx skills/scripts/learner.ts` | `/dev-learn` |
| `./skills/scripts/doctor.sh` | `/dev-setup`, `/dev-debug` |

---

## Progressive disclosure

- **SKILL.md** — enforcement + slash command index
- **commands/** — `/dev-*` workflows
- **rules/** — constraints
- **references/** — architecture, playbooks, templates
- **learnings/** — team deviations

Index: [references/skill-advanced-topics.md](references/skill-advanced-topics.md)

---

## Related project skills

`api-design` · `ui-ux-pro-max` · `deployment-guardian` · `fix`

## Install

```bash
npx skills add gymkhana-fitness-360/gymkhana@dev -y
npx skills add . -s dev -y
```
