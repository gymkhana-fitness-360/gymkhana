# Development workflow

## Validation gates

From the **product** repo root (`fitness360`):

```bash
npm run dev:validate        # full completion gates (skills orchestrator)
npm run dev:validate:quick  # typecheck + audits + lint only
```

`dev-validate.mjs` resolves the skills script in this order:

1. `skills/scripts/validate.ts` (submodule or symlink)
2. `../gymkhana-skills/scripts/validate.ts` (monorepo sibling)

If neither exists, it runs the core product gates inline.

Equivalent when the skills repo is checked out next to product:

```bash
npx tsx ../gymkhana-skills/scripts/validate.ts
```

## First-time setup

```bash
npm run fitness360:init   # local CLI — .env, postgres, migrate, seed
npm run dev
```

Do **not** use `npx @fitness360/cli` until the package is published; the in-repo CLI lives at `packages/cli`.

## Individual audits

| Command | Purpose |
|---------|---------|
| `npm run audit:tenant-scope:p0` | Block cross-tenant P0 routes |
| `npm run audit:mutating-zod` | Zod on mutating API bodies |
| `npm run test:ci` | CI-safe unit tests |
| `npm run openapi:generate` | Regenerate `openapi/openapi.json` |
