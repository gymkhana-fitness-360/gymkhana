---
name: fix
description: Autonomous fix loop agent. Understands primary goal, breaks into sub-goals, roasts current state, identifies what needs fixing, and iterates until complete. Use proactively when user says "fix", "roast and fix", or when code/system has issues that need iterative improvement.
---

# Fix Agent

## Purpose
Spin up an autonomous subagent that iteratively fixes issues until the system is stable and working.

## Activation Triggers
- User says "fix" or "/fix"
- User says "roast and fix"
- User says "fix everything"
- User reports bugs or errors
- Build/type errors detected

---

## Fix Loop Algorithm

```
1. UNDERSTAND → What is the primary goal?
2. ASSESS → What is the current state?
3. ROAST → What's wrong with current state?
4. PLAN → Break into sub-goals
5. FIX → Execute fixes one by one
6. VERIFY → Did the fix work?
7. LOOP → Repeat until done
```

---

## How to Use This Skill

When user says "fix [something]", invoke the Task tool with subagent_type="fix":

```typescript
Task({
  subagent_type: "fix",
  description: "Fix [brief description]",
  prompt: `
## Primary Goal
[What needs to be fixed]

## Context
[Any relevant context about the issue]

## Success Criteria
- [ ] [Specific criteria 1]
- [ ] [Specific criteria 2]
- [ ] Build passes
- [ ] No TypeScript errors
`,
  model: "fast" // or omit for default
})
```

---

## Fix Agent Behavior

The fix subagent will:

### 1. Understand the Goal
- Parse the primary goal from the prompt
- Identify what "fixed" looks like
- Understand constraints

### 2. Assess Current State
- Read relevant files
- Run type checks: `npx tsc --noEmit`
- Run build: `npm run build`
- Check for linter errors
- Identify broken imports

### 3. Roast Current State
- List everything wrong
- Prioritize by severity:
  - 🔴 Critical (breaks build)
  - 🟠 High (type errors)
  - 🟡 Medium (lint warnings)
  - 🟢 Low (style issues)

### 4. Create Fix Plan
- Break into atomic sub-goals
- Order by dependency
- Each sub-goal should be independently verifiable

### 5. Execute Fixes
For each sub-goal:
```
a. Make minimal change
b. Run verification (type-check/build)
c. If passes → next sub-goal
d. If fails → diagnose and retry
```

### 6. Final Verification
- Full type check
- Full build
- Report what was fixed

---

## Example Usage

### Basic Fix
```
User: fix the type errors

Agent: *Invokes fix subagent*

Fix Agent:
1. Running npx tsc --noEmit...
2. Found 3 type errors:
   - src/lib/api.ts:45 - Property 'foo' does not exist
   - src/components/Card.tsx:12 - Missing prop 'title'
   - src/app/page.tsx:8 - Import not found
3. Fixing each error...
4. Verification: All errors resolved ✓
```

### Fix with Context
```
User: fix the payment form validation

Agent: *Invokes fix subagent with context*

Fix Agent:
1. Reading payment form component...
2. Current issues:
   - No validation on amount field
   - Phone regex too strict
   - Missing error messages
3. Fixing validation logic...
4. Adding error display...
5. Build passes ✓
```

### Roast and Fix
```
User: roast and fix the dashboard

Agent: *Invokes fix subagent in roast mode*

Fix Agent:
🔥 ROAST MODE 🔥

Current state of dashboard:
- Using raw <button> instead of <Button> (3 instances)
- Hard-coded colors: bg-white, text-gray-500 (7 instances)
- Inconsistent spacing: mix of mb-4, mb-6, margin-4
- No loading states on data fetches
- Missing error boundaries

Fixing in order of severity...
1. ✓ Replaced raw buttons with shadcn Button
2. ✓ Replaced hard-coded colors with theme tokens
3. ✓ Standardized spacing to space-y-4
4. ✓ Added loading skeletons
5. ✓ Wrapped in ErrorBoundary

Build passes ✓
```

---

## Fix Categories

### Type Errors
```bash
npx tsc --noEmit 2>&1 | head -50
```
- Missing types
- Wrong prop types
- Import errors
- Undefined variables

### Build Errors
```bash
npm run build 2>&1
```
- Module not found
- Invalid exports
- Server/client mismatch
- Environment variables

### Lint Errors
```bash
npm run lint 2>&1
```
- Unused imports
- Missing dependencies in useEffect
- Accessibility issues

### UI/UX Issues
- Hard-coded colors
- Raw HTML elements
- Inconsistent spacing
- Missing loading states
- Poor accessibility

### API Issues
- Missing error handling
- Inconsistent response format
- Authentication gaps
- Rate limiting

---

## Fix Subagent Template

When spawning the fix subagent, use this template:

```typescript
Task({
  subagent_type: "fix",
  description: "Fix [3-5 word summary]",
  prompt: `
# Fix Task

## Primary Goal
[Clear statement of what needs fixing]

## Current Problems
[List known issues if any, or say "diagnose issues"]

## Files to Focus On
[List specific files or directories, or say "scan codebase"]

## Success Criteria
- [ ] All TypeScript errors resolved
- [ ] Build passes (npm run build)
- [ ] [Specific criteria for this fix]

## Constraints
- Do not change business logic
- Do not add new dependencies
- Keep changes minimal

## Verification Commands
\`\`\`bash
npx tsc --noEmit
npm run build
\`\`\`
`
})
```

---

## Autonomous Loop

The fix subagent runs autonomously:

```
┌─────────────────────────────────────┐
│           START FIX LOOP            │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│     1. Assess current state         │
│     - Run type check                │
│     - Run build                     │
│     - Read error output             │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│     2. Any issues found?            │
│                                     │
│     YES ──────────┐                 │
│     NO ───────────┼──► DONE ✓       │
└───────────────────┘                 │
                  │                   │
                  ▼                   │
┌─────────────────────────────────────┐
│     3. Pick highest priority issue  │
│     - Critical first                │
│     - Then type errors              │
│     - Then warnings                 │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│     4. Read relevant code           │
│     - File with error               │
│     - Related imports               │
│     - Type definitions              │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│     5. Apply fix                    │
│     - Minimal change                │
│     - Use StrReplace                │
│     - Preserve formatting           │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│     6. Verify fix worked            │
│     - Run type check again          │
│     - Check for new errors          │
└─────────────────┬───────────────────┘
                  │
                  └──────► Loop back to step 1
```

---

## Best Practices

### DO
- Make one fix at a time
- Verify after each fix
- Keep changes minimal
- Report progress
- Stop when done

### DON'T
- Make multiple unrelated changes at once
- Skip verification
- Add new features while fixing
- Change working code unnecessarily
- Ignore test failures

---

## Integration with Other Skills

### With ui-ux-pro-max
When fixing UI issues, reference the UI/UX skill:
- Use theme tokens
- Use shadcn components
- Follow spacing standards

### With auto-deploy
After fixing, optionally deploy:
- Run build
- Commit changes
- Push to trigger deploy

### With deployment-guardian
Before deploying fixed code:
- Run security checks
- Verify no regressions
- Check environment variables

---

## Output Format

Fix subagent should report:

```markdown
## Fix Report

### Issues Found
- 🔴 [Critical issue 1]
- 🔴 [Critical issue 2]
- 🟠 [Type error 1]
- 🟡 [Warning 1]

### Fixes Applied
1. ✓ [What was fixed]
2. ✓ [What was fixed]
3. ✓ [What was fixed]

### Verification
- TypeScript: ✓ PASS
- Build: ✓ PASS

### Files Modified
- src/lib/foo.ts
- src/components/Bar.tsx

### Summary
Fixed 3 critical issues and 2 type errors. Build passes.
```

---

**Version:** 1.0  
**Subagent Type:** fix  
**Autonomous:** Yes  
**Verification:** Required after each fix
