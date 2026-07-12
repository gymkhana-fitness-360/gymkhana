---
name: dev-debug
description: Local diagnostics — env, Postgres, Prisma, ports; optional deep typecheck
always: false
---

# Debugger (`/dev-debug`)

**Usage:** `/dev-debug` or `/dev-debug --deep`

## Execute

```bash
tsx skills/scripts/debug.ts
tsx skills/scripts/debug.ts --deep    # + typecheck & lint
```

## What it checks

| Check | Pass | Fail / warn |
|-------|------|-------------|
| Node >= 20.9 | ✓ | ✗ |
| npm, git, docker | ✓ / ⚠ | ✗ npm |
| `.env` + required vars | ✓ | ✗ missing `DATABASE_URL`, `NEXTAUTH_*` |
| Postgres container | ✓ `fitness360-pg` | ⚠ not running |
| Prisma migrate / DB | ✓ | ✗ pending migrations or unreachable DB |
| Prisma client | ✓ | ⚠ run `db:generate` |
| `~/package-lock.json` | ✓ absent | ⚠ breaks Next resolution |
| Ports 3000 / 5432 | info | 3000 in use = dev server likely up |

Exit code **1** when any check fails.

## Related

- `/dev-setup` — first-time install
- `./skills/scripts/doctor.sh` — CLI toolchain only
