# Fitness360 — npm & tooling commands

All commands from repo root unless noted.

## Local setup & run

```bash
npx @fitness360/cli                    # full install (clone or use --here)
npx @fitness360/cli init --here
npm run fitness360:init                # alias: node packages/cli/bin/fitness360.js init --here
node packages/cli/bin/fitness360.js doctor

docker compose up -d postgres          # Postgres only
docker compose down

npm run dev                            # webpack dev server :3000
npm run dev:turbo                      # turbopack dev
npm run dev:skip-check
npm run build
npm run start
```

## Database (Prisma)

```bash
npm run db:generate                    # prisma generate
npm run db:push                        # dev only — prefer migrate
npm run db:migrate:deploy              # production / CI
npx prisma migrate dev --name <slug>   # create migration
npm run db:studio
npm run db:seed                        # demo account + gym + plans
npm run db:seed-demo-gym               # scripts/seed-demo-gym.ts only
npm run db:anonymize-members           # PII scrub script
```

## Quality & validation

```bash
npm run typecheck
npm run lint
npm run precommit                      # validate:quick + lint

npm run validate                       # full validate CLI
npm run validate:quick
npm run validate:api
npm run validate:ts
npm run validate:db
npm run validate:json
npm run validate:verbose
npm run validate:business-rules
```

## Tests

```bash
npm run test                           # jest (all)
npm run test:ci                        # excludes DB-heavy integration suites
npm run test:watch
npm run test:coverage

npm run test:e2e
npm run test:e2e:smoke                 # login, dashboard, renewals-chase
npm run test:e2e:ui
npm run test:e2e:headed
npm run test:e2e:prod                  # BASE_URL env

npm run test:endpoints
npm run test:endpoints:local
npm run test:deployment                # validate + test:endpoints
```

## Audits & codegen

```bash
npm run audit:api-routes               # generate route audit
npm run audit:api-routes:check
npm run audit:tenant-scope
npm run audit:tenant-scope:p0          # fail on P0 tenant bugs
npm run audit:mutating-zod             # mutating routes must use Zod
npm run openapi:generate
```

## Deploy & ops

```bash
npm run vercel-build                   # prisma generate && next build
npm run deploy                         # check-file-updates + vercel --prod
npm run deploy:force
npm run deploy:check
npm run deploy:stats
npm run deploy:failures
```

## Domain-specific scripts

```bash
npm run import:payments                # xlsx import archive
npm run cleanup:duplicates
npm run generate-icons

npm run whatsapp:listener
npm run whatsapp:poll

npm run errors:monitor
npm run errors:watch
npm run errors:summary
npm run errors:comprehensive
npm run errors:report
npm run errors:export

npm run mcp:setup
npm run mcp:server
```

## Dev skill slash commands

Skill commands are **`/dev-*` only** — see `commands/*.md`. Agent runs `tsx skills/scripts/*.ts` under the hood.

| Slash command | Script |
|---------------|--------|
| `/dev-debug` | `tsx skills/scripts/debug.ts` |
| `/dev-validate` | `tsx skills/scripts/validate.ts` |
| `/dev-learn` | `tsx skills/scripts/learner.ts` |

Not skill commands — repo tooling invoked by `/dev-validate`:

```bash
npm run typecheck
npm run lint
npm run test:ci
npm run audit:tenant-scope:p0
npm run audit:mutating-zod
```

## CLI package (publish)

```bash
cd packages/cli && npm publish --access public
```
