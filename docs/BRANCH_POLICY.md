# Branch policy

`main` is **protected**. Do not push commits directly to `main`.

## Required workflow

1. Branch from `main`: `feat/…`, `fix/…`, `docs/…`, or `chore/…`.
2. Open a **pull request** against `main`.
3. Ensure **CI passes** on the PR before merge (policy; GitHub required checks re-enabled when CI is green on `main`).
4. Merge via GitHub (squash or merge commit — maintainer preference).
5. Delete the branch after merge.

Direct pushes to `main` are blocked by GitHub branch protection (including for admins).

## CI (policy)

These jobs run on every PR and should pass before merge:

- Lint, typecheck, build
- Prisma migrate check
- API route audit freshness
- Playwright smoke

GitHub **required status checks** are not gating merges yet because `main` CI needs cleanup; re-enable in branch protection when green.

## Releases

Tag only from `main` after merge. See [RELEASES.md](RELEASES.md).

## Local guard (optional)

```bash
git config core.hooksPath .githooks
```

The pre-push hook rejects accidental `git push origin main`.
