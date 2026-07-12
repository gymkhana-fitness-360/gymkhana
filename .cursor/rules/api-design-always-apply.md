---
description: Binds the api-design project skill so it always applies in this workspace.
globs: ["**/*"]
alwaysApply: true
---

# API design — always apply

Treat `.cursor/skills/api-design/SKILL.md` as **always in scope** for this repository. Follow its **Instructions** and **Checklist** on every task unless the user explicitly limits the session to work that cannot affect HTTP/RPC surfaces, auth, data exposure, or integrations. Prefer contract, security, and lifecycle discipline from that file even when the change is small or indirect.

## GymFlo — more REST without a rewrite

1. **Resources** — New CRUD-shaped work stays under `/api/{plural}` and `/api/{plural}/[id]`. Use `@/lib/api/resource-paths` (`apiPaths`) instead of hard-coded path strings.
2. **Commands** — For non-CRUD behavior: prefer **`POST /api/{collection}/[id]/{sub-resource}`** when the action belongs to one instance (e.g. a future `…/reminders`). For cross-entity or cron-style jobs, add **`POST /api/operations/{kebab-case}`** under `src/app/api/operations/` rather than new top-level `/api/foo-bar` siblings. Do not rename existing URLs without versioning and a deprecation window.
3. **HTTP** — Keep **GET** safe; put filters in **query**; identity in **path**; side effects off GET.
