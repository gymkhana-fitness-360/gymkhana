# Open core scope

What this **public** repository includes and what is hosted separately.

## In this repo (Fitness360 / `gymkhana`)

| Surface | Paths |
|---------|--------|
| Product app | `/login`, `/signup`, `/dashboard`, `/member` |
| APIs | `/api/*` (tenant-scoped gym operations) |
| Self-host | `packages/cli`, `docker-compose.yml`, Prisma schema + migrations |
| Optional integrator APIs | `/api/agent/*`, `/api/mcp` when `ENABLE_AGENT_API=true` |

Self-hosters deploy this repo on their own infrastructure. White-label via `NEXT_PUBLIC_APP_NAME`.

## Not in this repo

Marketing (`www.gymkhana.fit`), interactive playground, and the developers portal are **not** part of the open-source tree. They are operated separately by Gymkhana.

If you link to an external marketing site, set `NEXT_PUBLIC_MARKETING_SITE_URL` (see `.env.example`).

## Related

- [CONTRIBUTING.md](../CONTRIBUTING.md) — contribution process
- [DEVELOPMENT.md](DEVELOPMENT.md) — developer setup
