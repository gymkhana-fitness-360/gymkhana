# GymFlo Multi-Agent System

A collaborative multi-agent system for building the GymFlo platform with quality gates and persistent context.

## Agents Overview

| Agent | Role | When Used |
|-------|------|-----------|
| **orchestrator** | Master coordinator | Entry point for all requests |
| **info-gathering** | Requirements engineer | Gathers requirements, asks questions |
| **validation** | Feasibility checker | Validates requirements, estimates effort |
| **builder** | Implementation specialist | Writes code, creates tests |
| **roast** | Critical reviewer | Finds flaws, challenges assumptions |
| **review** | Quality gate | Final approval before merge |
| **content-memory** | Knowledge manager | Stores context, provides history |

## Workflow

```
User Request
    ↓
Orchestrator (coordinates)
    ↓
Info Gathering (requirements)
    ↓
Validation (feasibility)
    ↓
Builder (implementation)
    ↓
Roast (critical review)
    ↓
Review (final approval)
    ↓
Content Memory (archive)
    ↓
DONE ✅
```

## How to Use

### Option 1: Use Orchestrator (Recommended)

The orchestrator manages the entire workflow:

```
@orchestrator Build multi-gym support with RLS policies
```

The orchestrator will:
1. Delegate to info-gathering
2. Wait for validation
3. Trigger builder
4. Run roast review
5. Get final review approval
6. Archive in content-memory

### Option 2: Use Individual Agents

For specific tasks, invoke agents directly:

```
@info-gathering What are the requirements for OAuth 2.0 implementation?

@validation Is it feasible to add real-time subscriptions?

@builder Implement the gym selector component

@roast Review the authentication middleware

@review Final check before deploying multi-gym feature
```

### Option 3: Auto-Trigger (Always On)

Agents automatically trigger on events:

- **File change** → roast + content-memory
- **Test failure** → validation + builder
- **Linter error** → builder (auto-fix)
- **Git commit** → review + content-memory
- **User message** → orchestrator → info-gathering

## Agent Communication

Agents communicate through structured handoffs:

```
info-gathering → validation
  Passes: Requirements document

validation → builder
  Passes: Approved requirements + validation report

builder → roast
  Passes: Implementation + test results

roast → review
  Passes: Roast report + fixed code

review → content-memory
  Passes: Approved implementation + all reports
```

## Quality Gates

Every implementation goes through 2 quality gates:

1. **Roast Gate** (Critical Review)
   - Finds flaws and issues
   - Rejects bad code
   - Sends back for fixes

2. **Review Gate** (Final Approval)
   - Verifies quality standards
   - Checks production readiness
   - Approves for merge

**Nothing reaches production without passing both gates.**

## Persistent Context

The **content-memory** agent stores everything:

- Requirements and decisions
- Code patterns and implementations
- Test results and coverage
- Error logs and fixes
- Roast critiques and review approvals

**Location**: `.cursor/memory/`

**Retrieval**: Agents can query past context for similar problems, patterns, and lessons learned.

## Example Usage

### Building a Feature

```
User: "Add OAuth 2.0 support"

Orchestrator: 
  → Delegating to info-gathering agent...

Info Gathering:
  → Researching existing auth system...
  → Found NextAuth implementation
  → Question: Should we replace NextAuth or add OAuth alongside?
  
User: "Add alongside, don't break existing auth"

Info Gathering:
  → Requirements documented
  → Handing off to validation...

Validation:
  → Checking feasibility...
  → ✅ Feasible, estimated 2-3 days
  → Risk: Medium (auth is critical)
  → Handing off to builder...

Builder:
  → Implementing OAuth server...
  → Created 8 files
  → Written 45 tests
  → All tests passing
  → Handing off to roast...

Roast:
  🔥 Found 2 critical issues:
  1. Client secret not hashed
  2. Missing PKCE validation
  → Returning to builder for fixes...

Builder:
  → Fixed critical issues
  → Re-running tests
  → All tests passing
  → Handing off to roast...

Roast:
  ✅ All issues resolved
  → Code looks solid
  → Handing off to review...

Review:
  ✅ All quality checks passed
  ✅ Production ready
  ✅ APPROVED FOR MERGE

Content Memory:
  → Stored OAuth implementation pattern
  → Archived all decisions
  → Updated knowledge base

Orchestrator:
  ✅ OAuth 2.0 support complete!
  → 8 files created
  → 45 tests passing
  → Ready to merge
```

## Agent Status

Check agent status anytime:

```
@orchestrator status
```

Output:
```markdown
## 🤖 Agent Status

### Active Agents
- info-gathering: Idle
- validation: Idle
- builder: Idle
- roast: Idle
- review: Idle
- content-memory: ✅ Always observing

### Current Task
- None | [Feature name]

### Queue
- 0 tasks pending

### Recent Activity
- 10:30 AM: Completed multi-gym support
- 11:45 AM: Completed OAuth 2.0
- 2:15 PM: Completed webhook system

### Statistics (Today)
- Features completed: 3
- Tests written: 127
- Code reviews: 3
- Issues found: 8
- Issues fixed: 8
```

## Configuration

### Agent Settings

Edit `.cursor/agents/config.json`:

```json
{
  "orchestrator": {
    "maxRetries": 3,
    "timeout": 30,
    "parallelExecution": true
  },
  "info-gathering": {
    "maxQuestionsPerSession": 5,
    "autoResearch": true
  },
  "validation": {
    "strictMode": true,
    "requireTestPlan": true
  },
  "builder": {
    "autoTest": true,
    "autoLint": true,
    "testCoverageThreshold": 80
  },
  "roast": {
    "brutalityLevel": "high",
    "autoFix": false
  },
  "review": {
    "requireAllChecks": true,
    "allowMinorIssues": true
  },
  "content-memory": {
    "storageLocation": ".cursor/memory/",
    "enableEmbeddings": true,
    "retentionDays": 365
  }
}
```

## Troubleshooting

### Agent Not Responding
```
1. Check agent file exists: .cursor/agents/[name].md
2. Verify YAML frontmatter is valid
3. Try invoking directly: @[agent-name] [task]
```

### Feedback Loop
```
If agents keep looping:
1. Orchestrator detects loop (>3 iterations)
2. Breaks loop and reports to user
3. Requests manual intervention
```

### Agent Disagreement
```
If roast rejects but review approves:
1. Orchestrator prioritizes roast (more critical)
2. Sends back to builder
3. Requires both approvals
```

## Best Practices

1. **Always use orchestrator** for full features
2. **Use individual agents** for specific tasks
3. **Let agents communicate** through handoffs
4. **Don't skip quality gates** - they prevent bugs
5. **Trust the process** - agents know their job

## Monitoring

### Agent Performance

Track agent effectiveness:

```
@orchestrator metrics
```

Output:
```markdown
## 📊 Agent Metrics

### Info Gathering
- Questions asked: 23
- Requirements documented: 8
- Avg time: 5 minutes

### Validation
- Approvals: 7 (87%)
- Rejections: 1 (13%)
- Avg time: 2 minutes

### Builder
- Features built: 8
- Tests written: 245
- First-time pass rate: 62%
- Avg time: 45 minutes

### Roast
- Reviews conducted: 8
- Critical issues found: 12
- Major issues found: 18
- Approval rate: 62%

### Review
- Final approvals: 8 (100%)
- Changes requested: 3 (37%)
- Rejections: 0 (0%)
- Avg time: 10 minutes

### Content Memory
- Entries stored: 156
- Patterns identified: 12
- Lessons learned: 8
```

## Getting Started

1. **Invoke orchestrator** with your first request:
   ```
   @orchestrator I want to add multi-gym support
   ```

2. **Watch the workflow** as agents collaborate

3. **Answer questions** from info-gathering when asked

4. **Review output** when complete

5. **Iterate** based on feedback

## Tips

- **Be specific** in your requests - helps info-gathering
- **Answer questions promptly** - keeps workflow moving
- **Trust the roast** - brutal feedback prevents bugs
- **Review the review** - final check before merge
- **Learn from memory** - check past patterns

## Support

If agents aren't working as expected:
1. Check agent files exist in `.cursor/agents/`
2. Verify YAML frontmatter is valid
3. Check agent descriptions are clear
4. Try invoking directly to debug
5. Review agent logs in `.cursor/memory/`

---

**Ready to build? Invoke the orchestrator!**

```
@orchestrator Let's build the GymFlo platform!
```
