# Fitness360

Open-source gym management platform — **Next.js 16**, **Prisma**, **PostgreSQL**.

**Repository:** [github.com/gymkhana-fitness-360/gymkhana](https://github.com/gymkhana-fitness-360/gymkhana) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [Releases](https://github.com/gymkhana-fitness-360/gymkhana/releases)

## Features

- Member, membership, and payment management
- Attendance (including QR check-in)
- Dashboard analytics and billing
- Optional WhatsApp Business API reminders (Meta Cloud API)

See [CHANGELOG.md](CHANGELOG.md) and [GitHub Releases](https://github.com/gymkhana-fitness-360/gymkhana/releases) for version history. Feature parity: [docs/FEATURE_PARITY.md](docs/FEATURE_PARITY.md).

## Requirements

- Node.js **≥ 24**
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
| [docs/OPEN_CORE.md](docs/OPEN_CORE.md) | What is / isn't in this public repo |
| [docs/adr/](docs/adr/) | Architecture decision records |
| [gymkhana-skills](https://github.com/gymkhana-fitness-360/gymkhana-skills) | Agent dev skill — `npx skills add gymkhana-fitness-360/gymkhana-skills@dev -y` |
| [openapi/openapi.json](openapi/openapi.json) | HTTP API (`npm run openapi:generate`) |

## License

[Apache License 2.0](LICENSE)
