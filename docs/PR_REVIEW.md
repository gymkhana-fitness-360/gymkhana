# Pull request review (CodeRabbit)

Every PR to `main` gets an **AI code review** before merge, similar to [CodeRabbit](https://coderabbit.ai).

## One-time setup (org admin)

1. Install the GitHub App on **gymkhana-fitness-360**:  
   [github.com/apps/coderabbitai](https://github.com/apps/coderabbitai)
2. Grant access to **gymkhana** (and **gymkhana-cloud** if on a plan that supports private repos).
3. Repo config is version-controlled in [`.coderabbit.yaml`](../.coderabbit.yaml) at the root.

## Merge checklist

Before merging a PR:

1. **CodeRabbit review finished** — summary + inline comments on the PR.
2. **Address feedback** — fix or reply with rationale; resolve review threads.
3. **CI green** — `npm run typecheck`, lint, tests locally; GitHub Actions when enabled.
4. **Merge** — squash or merge commit; delete branch.

`main` branch protection requires **resolved conversations** on the PR (review threads must be closed).

## Useful CodeRabbit commands (PR comment)

| Command | Purpose |
|---------|---------|
| `@coderabbitai review` | Re-run review |
| `@coderabbitai summary` | High-level summary only |
| `@coderabbitai configuration` | Show resolved config |

## Without CodeRabbit

If the app is not installed, reviews will not run automatically. Install the app or run local checks from [DEVELOPMENT.md](DEVELOPMENT.md) before merging.

## Related

- [BRANCH_POLICY.md](BRANCH_POLICY.md) — PR-only workflow
- [CONTRIBUTING.md](../CONTRIBUTING.md)
