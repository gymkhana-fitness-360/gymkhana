# Branch policy

`main` is **protected**. Do not push commits directly to `main`.

## Required workflow

1. Branch from `main`: `feat/…`, `fix/…`, `docs/…`, or `chore/…`.
2. Open a **pull request** against `main`.
3. Wait for **CI** to pass (all required checks green).
4. Merge via GitHub (squash or merge commit — maintainer preference).
5. Delete the branch after merge.

Direct pushes to `main` are blocked by GitHub branch protection (including for admins).

## Required CI checks

- Lint, typecheck, build
- Prisma migrate check
- API route audit freshness
- Playwright smoke

## Releases

Tag only from `main` after merge. See [RELEASES.md](RELEASES.md).

## Local guard (optional)

```bash
git config core.hooksPath .githooks
```

The pre-push hook rejects accidental `git push origin main`.
