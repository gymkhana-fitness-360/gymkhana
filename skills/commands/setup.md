---
name: dev-setup
description: First-time local install — CLI init, Postgres, migrate, seed, smoke test
always: false
---

# Local setup (`/dev-setup`)

**Usage:** `/dev-setup` — fresh clone or existing repo without working `.env`/DB.

Run from repo root.

## Step 1: Install

```bash
npx @fitness360/cli              # clone → .env → docker postgres → npm ci → migrate → seed
npx @fitness360/cli init --here  # same, in existing clone
```

## Step 2: Verify toolchain

```bash
./skills/scripts/doctor.sh
```

Or: `/dev-debug` for full environment check.

## Step 3: Postgres only (if needed)

```bash
docker compose up -d postgres
```

## Step 4: Dev server

```bash
npm run dev
```

## Step 5: Smoke

1. `/signup` → create account
2. `/dashboard`
3. Add member → record payment

## Secrets

CLI writes `NEXTAUTH_SECRET`, `CRON_SECRET`, `QR_SECRET` into `.env`.

Env reference: [references/architecture.md](../references/architecture.md).
