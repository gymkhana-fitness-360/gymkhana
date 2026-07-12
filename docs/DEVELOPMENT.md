# Development guide

Technical reference for running and changing the Fitness360 codebase. For contribution process (issues, PR etiquette), see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Setup

See [README.md](../README.md) for quick start. Minimum local workflow:

```bash
npm ci
cp .env.example .env
docker compose up -d postgres
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Or: `npx @fitness360/cli init --here`

Database env vars: [prisma/ENV.md](../prisma/ENV.md).

## Project layout

```
src/app/api/     → HTTP routes (thin; delegate to domains)
src/domains/     → business logic handlers and adapters
prisma/          → schema and migrations
```

Architecture overview: [docs/adr/001-modular-monolith-first.md](adr/001-modular-monolith-first.md)

Agent skill (Cursor / Claude): [gymkhana-skills](https://github.com/gymkhana-fitness-360/gymkhana-skills) — `npx skills add gymkhana-fitness-360/gymkhana-skills@dev -y`

## Conventions

| Area | Rule | ADR |
|------|------|-----|
| API routes | Thin handlers; logic in `src/domains/` | [001](adr/001-modular-monolith-first.md) |
| Auth | Classify routes in `src/lib/security/api-auth-classes.ts` | [002](adr/002-api-auth-classes.md) |
| Tenancy | Every tenant query filters by `gymId` | [003](adr/003-mandatory-gym-id.md) |

Do not add marketing, playground, or `/developers` UI to this repo — those belong in gymkhana-cloud.

## Checks before a PR

```bash
npm run typecheck
npm run lint
npm run test:ci
npm run build
```

If you changed API routes or handlers:

```bash
npm run audit:api-routes
npm run audit:mutating-zod
npm run audit:tenant-scope
```

If you changed public HTTP APIs:

```bash
npm run openapi:generate
# commit openapi/openapi.json when the spec changes
```

## Optional: agent / MCP

Set `ENABLE_AGENT_API=true` in `.env`. See `.env.example` for AI and MCP variables.

```bash
npm run mcp:setup
npm run mcp:server   # requires app on :3000
```

## API spec

[openapi/openapi.json](../openapi/openapi.json) — regenerate with `npm run openapi:generate`.
