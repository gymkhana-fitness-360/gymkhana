# Prisma environment variables

| Variable | Used by | Notes |
|----------|---------|--------|
| `DATABASE_URL` | Next.js app, `PrismaClient` | Primary Postgres connection string |
| `DIRECT_DATABASE_URL` | `prisma migrate`, `db push`, `studio` | Same as `DATABASE_URL` unless your host uses a separate non-pooled URL |

## New database (recommended)

Use **one** Postgres instance (Neon, Vercel Postgres, Railway, RDS, local Docker, etc.). Do **not** use Supabase transaction pooler URLs (`:6543`, `pgbouncer=true`) unless you intentionally keep that setup.

```bash
# Local or single-URL providers (Neon pooled, Vercel Postgres, local Docker)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

Replace `USER`, `PASSWORD`, `HOST`, and `DATABASE` with values from your provider. For local dev without SSL:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/gymflo"
DIRECT_DATABASE_URL="postgresql://user:password@localhost:5432/gymflo"
```

### First-time schema on empty DB

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL and DIRECT_DATABASE_URL (same string is fine)

npm run db:generate
npm run db:migrate:deploy    # applies prisma/migrations/*
# Optional demo data:
npm run db:seed-demo-gym
```

### Cutover from old Supabase pooler URL

1. Create the new empty Postgres database in your provider.
2. Set **both** env vars to the new URL (remove any `aws-0-....pooler.supabase.com:6543` value).
3. Run `npm run db:migrate:deploy` against the new DB.
4. Migrate data if needed: `SOURCE_DATABASE_URL` + `TARGET_DATABASE_URL` via `scripts/export-import-data.ts` (see [docs/DATABASE_MIGRATION.md](../docs/DATABASE_MIGRATION.md)).
5. Update Vercel → Settings → Environment Variables; redeploy.
6. Revoke or delete the old Supabase project when satisfied.

## Hosts with separate pooler + direct URLs

Some providers expose a **pooled** URL for serverless and a **direct** URL for migrations. Only then use two different values:

| Variable | Typical use |
|----------|-------------|
| `DATABASE_URL` | Pooled / serverless runtime |
| `DIRECT_DATABASE_URL` | Migrations, `prisma studio`, long transactions |

If you are **not** on such a host, set both variables to the **same** string.

## Legacy Supabase pooler (deprecated for this project)

Avoid for new deployments:

```bash
# Do not use for new GymFlo databases
DATABASE_URL="postgresql://...@....pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_DATABASE_URL="postgresql://...@....supabase.com:5432/postgres"
```

`src/lib/prisma-env.ts` still normalizes pooler URLs if present; prefer a single direct URL instead.

## Optional Supabase client (not the Prisma DB)

Auth/storage via Supabase is separate from `DATABASE_URL`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Clear these if you are not using Supabase features.

## Vercel pull gotcha

`vercel env pull` may append literal `\n` to values. The app strips these in `src/lib/prisma-env.ts` — re-save in the Vercel UI if auth still fails.

## Commands

```bash
npm run db:generate        # prisma generate
npm run db:migrate:deploy  # production migrations (uses DIRECT_DATABASE_URL)
npm run db:push            # dev schema push (prefer migrate in shared envs)
npm run db:studio          # Prisma Studio
```

Do not put `VERCEL_*`, `TURBO_*`, or OIDC tokens in `.env` files.
