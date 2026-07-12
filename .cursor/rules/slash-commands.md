---
description: Slash commands for quick actions. Activates when user types /fix, /deploy, /roast, /build, etc.
globs: ["**/*"]
alwaysApply: true
---

# Slash Commands

## Available Commands

### /fix [target]
Spawn a fix subagent to autonomously fix issues.

**Usage:**
- `/fix` - Fix all detected issues
- `/fix types` - Fix TypeScript errors
- `/fix build` - Fix build errors  
- `/fix ui` - Fix UI/UX issues
- `/fix [file]` - Fix specific file

**Behavior:**
Invokes Task tool with `subagent_type: "fix"` that:
1. Diagnoses issues
2. Creates fix plan
3. Applies fixes iteratively
4. Verifies after each fix
5. Reports results

---

### /roast [target]
Critically analyze and then fix issues.

**Usage:**
- `/roast` - Roast entire codebase
- `/roast ui` - Roast UI/UX issues
- `/roast api` - Roast API design

**Behavior:**
Same as /fix but with detailed critique before fixing.

---

### /build
Run production build.

**Usage:**
- `/build` - Run npm run build

**Behavior:**
```bash
npm run build
```

---

### /deploy
Build and deploy to production.

**Usage:**
- `/deploy` - Full deploy workflow

**Behavior:**
Follows auto-deploy skill:
1. Run build
2. Commit changes
3. Push to GitHub
4. Vercel deploys automatically

---

### /check
Run all checks without fixing.

**Usage:**
- `/check` - Run type check + build
- `/check types` - TypeScript only
- `/check lint` - Lint only

**Behavior:**
```bash
npx tsc --noEmit
npm run build
```

---

## Command Mapping

| Command | Action |
|---------|--------|
| `/fix` | Spawn fix subagent |
| `/fix types` | Fix TypeScript errors |
| `/fix build` | Fix build errors |
| `/fix ui` | Fix UI using ui-ux-pro-max skill |
| `/roast` | Roast + fix |
| `/build` | Run production build |
| `/deploy` | Build + commit + push |
| `/check` | Verify without fixing |

---

## Implementation

When user types a slash command, execute immediately:

### /fix Example
```typescript
// User: /fix types

Task({
  subagent_type: "fix",
  description: "Fix TypeScript errors",
  prompt: `
## Primary Goal
Fix all TypeScript type errors in the codebase.

## Diagnosis
Run: npx tsc --noEmit

## Success Criteria
- [ ] npx tsc --noEmit exits with code 0
- [ ] No type errors remaining

## Verification
After each fix, run type check again.
`
})
```

### /build Example
```bash
npm run build
```

### /deploy Example
Follow auto-deploy skill workflow.
