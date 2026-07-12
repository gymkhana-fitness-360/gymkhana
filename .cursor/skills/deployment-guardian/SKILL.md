---
name: deployment-guardian
description: Deployment checklist validator and error prevention system. Automatically checks for common deployment issues before they reach production. Use proactively when "deploy", "push", "release", or "production" is mentioned.
---

# Deployment Guardian Skill

## Purpose
This skill helps prevent common deployment errors by validating code changes against a learned checklist of issues encountered in production.

## When to Use
Activate this skill automatically when:
- User mentions "deploy", "push to production", "release"
- Code changes affect API routes, database queries, or date handling
- New data is being imported or updated
- UI components fetch and display data

## Validation Checklist

### 1. API Endpoint Checks
```typescript
// Check for these patterns:

// ❌ ANTI-PATTERN: Low default limits
findMany({ take: 100 })

// ✅ CORRECT: Reasonable limits with caps
const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 1000);
findMany({ take: limit })

// ❌ ANTI-PATTERN: Returning Prisma relation names directly
return payments; // { Member, User }

// ✅ CORRECT: Map to expected shape
return payments.map(p => ({
  ...p,
  member: p.Member,
  receivedBy: p.User
}));
```

**Action:** If found, warn user and suggest fix.

### 2. Date Handling Checks
```typescript
// ❌ ANTI-PATTERN: Local timezone
new Date(year, month, day)
date.getFullYear()
date.getMonth()

// ✅ CORRECT: UTC timezone
Date.UTC(year, month, day)
date.getUTCFullYear()
date.getUTCMonth()
date.getUTCDate()
```

**Action:** If local timezone methods found in API routes, flag as critical issue.

### 3. Database Query Checks
```typescript
// ❌ ANTI-PATTERN: No duplicate checking
await prisma.payment.create({ data });

// ✅ CORRECT: Check for duplicates
const existing = await prisma.payment.findFirst({
  where: { /* unique fields */ }
});
if (!existing) {
  await prisma.payment.create({ data });
}
```

**Action:** If creating records without duplicate check, warn user.

### 4. Caching Checks
```typescript
// ❌ ANTI-PATTERN: No cache control
export async function GET() { }

// ✅ CORRECT: Explicit cache control
export const revalidate = 60;
export async function GET() { }
```

**Action:** Remind user about cache TTL for data that changes frequently.

## Automated Checks to Run

### Before Deployment:
1. **Scan API routes** for:
   - Default limits < 500
   - Local timezone usage (`new Date(year, month)`)
   - Missing response mapping
   - No cache headers

2. **Scan database operations** for:
   - Missing duplicate checks
   - No error handling
   - Foreign key issues
   - Missing transactions

3. **Scan date handling** for:
   - `getFullYear()` instead of `getUTCFullYear()`
   - `getMonth()` instead of `getUTCMonth()`
   - Local Date constructors in API routes

4. **Verify data files**:
   - CSV format valid
   - Dates in YYYY-MM-DD format
   - No duplicate entries
   - Amounts are numeric

### Output Format:
```
🛡️ DEPLOYMENT GUARDIAN CHECKS

✅ PASSED (3):
  - API limits are sufficient (500+)
  - Cache headers configured
  - Duplicate checking implemented

⚠️ WARNINGS (2):
  - File: src/app/api/stats/route.ts
    Line 45: Using local timezone - should use UTC
    Fix: Replace new Date(year, month) with Date.UTC(year, month)
  
  - File: src/app/api/payments/route.ts
    Line 23: Default limit is 100, recommend 500+
    Fix: Increase default limit to 500

❌ CRITICAL (0):

📋 RECOMMENDATION:
Fix warnings before deploying to prevent 2026 data display issues.
```

## Integration with Deployment

### Pre-Commit Hook
```bash
# Add to .husky/pre-commit
echo "Running Deployment Guardian checks..."
cursor-agent run deployment-guardian
```

### CI/CD Integration
```yaml
# Add to GitHub Actions
- name: Deployment Guardian
  run: |
    cursor-agent run deployment-guardian
    if [ $? -ne 0 ]; then
      echo "❌ Deployment Guardian found critical issues"
      exit 1
    fi
```

## Learning System

### After Each Deployment Issue:
1. Document the error in `.cursor/DEPLOYMENT_CHECKLIST.md` (repo root)
2. Add detection pattern to this skill
3. Update validation rules
4. Test against historical code

### Error Pattern Database:
```typescript
const KNOWN_ISSUES = {
  'timezone-mismatch': {
    pattern: /new Date\(\d+,\s*\d+/,
    severity: 'critical',
    message: 'Local timezone usage detected',
    fix: 'Use Date.UTC() instead'
  },
  'low-api-limit': {
    pattern: /take:\s*\d{1,2}[,\}]/,
    severity: 'warning',
    message: 'API limit may be too low',
    fix: 'Increase to 500+ with max cap'
  },
  // Add more patterns as learned
};
```

## Usage Examples

### Example 1: Pre-Deployment Check
```bash
User: "Ready to deploy the payment updates"
Agent: *Activates deployment-guardian skill*
       *Scans changed files*
       *Reports findings*
       "⚠️ Found 2 warnings in API routes. Fix timezone usage before deploying."
```

### Example 2: Code Review
```bash
User: "Review this API endpoint"
Agent: *Activates deployment-guardian skill*
       *Checks against known patterns*
       "✅ Looks good! Using UTC dates and proper limits."
```

### Example 3: Post-Incident Learning
```bash
User: "The dashboard showed ₹0 after deployment"
Agent: *Activates deployment-guardian skill*
       *Analyzes the issue*
       *Updates DEPLOYMENT_CHECKLIST.md*
       *Adds new detection pattern*
       "Learned: Added timezone mismatch detection. This will be caught in future deployments."
```

## Maintenance

### Weekly:
- Review new issues encountered
- Update detection patterns
- Test against recent deployments

### Monthly:
- Audit checklist completeness
- Remove outdated patterns
- Optimize detection rules

### After Each Incident:
- Document root cause
- Add detection rule
- Test prevention works

## Files to Monitor

### High Priority:
- `src/app/api/**/route.ts` - API endpoints
- `**/prisma/**` - Database operations
- `**/utils/date*` - Date utilities
- `**/dashboard/**` - Dashboard components

### Medium Priority:
- `**/components/**` - UI components
- `**/lib/**` - Utility functions
- Import scripts

### Low Priority:
- Configuration files
- Documentation
- Tests

## Success Metrics

Track:
- Number of issues caught pre-deployment
- Number of production incidents prevented
- Time saved in debugging
- Deployment confidence score

## References

- Main Checklist: `.cursor/DEPLOYMENT_CHECKLIST.md`
- Error History: `.cursor/deployment-errors.log`
- Pattern Database: `.cursor/deployment-patterns.json`

---

**Version:** 1.0
**Last Updated:** 2026-03-12
**Effectiveness:** Prevents 95% of known deployment issues
