# @fitness360/cli

One-command local setup for [Fitness360](https://github.com/fitness360/fitness360).

## Usage

```bash
# Clone + configure + migrate + seed (into ./fitness360)
npx @fitness360/cli

# Same, explicit
npx @fitness360/cli init

# Custom directory
npx @fitness360/cli init my-gym

# Already cloned the repo
npx @fitness360/cli init --here

# Check prerequisites
npx @fitness360/cli doctor
```

## What it does

1. Verifies Node.js ≥ 20.9
2. Clones the repo (unless `--here` or already in repo)
3. Writes `.env` with generated secrets and local Postgres URL
4. `docker compose up -d postgres`
5. `npm ci`
6. `npx prisma migrate deploy`
7. `npm run db:seed`

Then run `npm run dev` and open http://localhost:3000.

## Publish

```bash
cd packages/cli
npm publish --access public
```
