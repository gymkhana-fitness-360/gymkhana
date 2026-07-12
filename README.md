# Fitness360

Open-source gym management platform — **Next.js 16**, **Prisma**, **PostgreSQL**.

**Repository:** [github.com/gymkhana-fitness-360/gymkhana](https://github.com/gymkhana-fitness-360/gymkhana) · [Contributing](CONTRIBUTING.md)

## Features

- Member, membership, and payment management
- Attendance (including QR check-in)
- Dashboard analytics and billing
- Optional WhatsApp Business API reminders (Meta Cloud API)

## Requirements

- Node.js **≥ 20.9**
- PostgreSQL (local or hosted)
- npm **≥ 10**

## Quick start

```bash
npx @fitness360/cli
cd fitness360
npm run dev
```

Already cloned:

```bash
npx @fitness360/cli init --here
npm run dev
```

Manual:

```bash
git clone git@github.com:gymkhana-fitness-360/gymkhana.git
cd gymkhana
cp .env.example .env
docker compose up -d postgres
npm ci && npx prisma generate && npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` → `.env`. Required: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`. Optional: `CRON_SECRET` for `/api/cron/unified`. Database notes: [prisma/ENV.md](prisma/ENV.md).

## Deploy

```bash
npm run vercel-build
```

Any Node host with PostgreSQL works (Vercel, Railway, self-hosted).

## Developer docs

| Doc | Purpose |
|-----|---------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to file issues and open PRs |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local setup, conventions, CI |
| [docs/adr/](docs/adr/) | Architecture decision records |
| [skills/](skills/) | Agent dev skill (`/dev-*` workflows) |
| [openapi/openapi.json](openapi/openapi.json) | HTTP API (`npm run openapi:generate`) |

## License

[Apache License 2.0](LICENSE)
