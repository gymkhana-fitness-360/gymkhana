# Changelog

All notable changes to the [gymkhana](https://github.com/gymkhana-fitness-360/gymkhana) open-source product are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [SemVer](https://semver.org/).

**Live release notes:** [gymkhana.fit/developers#releases](https://www.gymkhana.fit/developers#releases) (API) · [gymkhana.fit/docs/updates](https://www.gymkhana.fit/docs/updates) (operators) · [GitHub Releases](https://github.com/gymkhana-fitness-360/gymkhana/releases)

---

## [0.2.0] - 2026-07-12

### Added

- **Member profile photos** — upload image or generate initials avatar from member profile (`POST /api/members/photo`, `POST /api/members/photo/generate`).
- **Custom entities API** — per-gym record types and JSON records (`/api/custom-entities`, `/api/custom-entities/[id]/records`).
- **Custom analytics API** — saved metrics over members, payments, attendance, or custom entities (`/api/custom-analytics`, `/api/custom-analytics/[slug]/run`).
- Prisma models: `CustomEntityDefinition`, `CustomEntityRecord`, `CustomAnalyticsDefinition`.
- Domain handlers: `src/domains/extensions/custom-entities.ts`, `custom-analytics.ts`.

### Changed

- OpenAPI spec regenerated with new routes (`npm run openapi:generate`).
- Documentation split: product guides, developer portal, contributor architecture (hosted on gymkhana-cloud).

### Documentation

- Feature parity matrix and release notes on developers portal.
- Operator feature updates at `/docs/updates`.

---

## [0.1.0] - 2026-07-10

### Added

- Initial open-source release of Fitness360 / Gymkhana gym management platform.
- Members, memberships, payments, billing, renewals, and overdue tracking.
- Attendance with QR check-in.
- Dashboard analytics and finances.
- WhatsApp reminders and campaigns (Meta Cloud API).
- Multi-gym tenancy with RBAC and mandatory `gymId` scoping.
- In-dashboard marketplace installs.
- Session-authenticated REST API (~165 routes).
- Preview public API v1 (`/api/v1/members`, `/api/v1/analytics/cashflow`).
- Agent / MCP integration (Settings → AI & MCP).
- Self-serve signup and OAuth login.
- CLI: `npx @fitness360/cli init`.

[0.2.0]: https://github.com/gymkhana-fitness-360/gymkhana/releases/tag/v0.2.0
[0.1.0]: https://github.com/gymkhana-fitness-360/gymkhana/releases/tag/v0.1.0
