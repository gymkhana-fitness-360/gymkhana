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

Marketing (`www.gymkhana.fit`), interactive playground, developers portal, and the **agent dev skill** ([gymkhana-skills](https://github.com/gymkhana-fitness-360/gymkhana-skills)) are **not** part of this application repo.

If you link to an external marketing site, set `NEXT_PUBLIC_MARKETING_SITE_URL` (see `.env.example`).

Integrator API reference and MCP are published at **`/developers`** on the marketing site (`gymkhana-cloud`). Operator help for gym owners belongs in **product** (in-app `/dashboard/help` when built).

## Related

- [CONTRIBUTING.md](../CONTRIBUTING.md) — contribution process
- [DEVELOPMENT.md](DEVELOPMENT.md) — developer setup
