# Architecture decision records

This folder follows the [ADR](https://adr.github.io/) style: short documents that capture an important architectural decision, the context, and the consequences.

## Index

| ADR | Status | Summary |
|-----|--------|---------|
| [001-modular-monolith-first.md](001-modular-monolith-first.md) | Accepted | One Next.js app, logic in `src/domains/`, thin API routes |
| [002-api-auth-classes.md](002-api-auth-classes.md) | Accepted | PUBLIC / SESSION / CRON_BEARER / WEBHOOK_SIGNED at middleware |
| [003-mandatory-gym-id.md](003-mandatory-gym-id.md) | Accepted | All tenant queries must filter by `gymId` |

When adding ADR-004+, copy the structure from an existing file and update this index.

For day-to-day development (setup, CI, conventions), see [DEVELOPMENT.md](../DEVELOPMENT.md).
