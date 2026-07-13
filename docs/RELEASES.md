# Release workflow

Single source of truth for version history across GitHub, the developers portal, and Mintlify operator docs.

## Repositories

| Surface | Location |
|---------|----------|
| **GitHub Releases** | [gymkhana-fitness-360/gymkhana/releases](https://github.com/gymkhana-fitness-360/gymkhana/releases) |
| **Changelog (human prose)** | [`CHANGELOG.md`](../CHANGELOG.md) |
| **Structured manifest** | [`docs/releases.json`](releases.json) |
| **Developers portal** | gymkhana-cloud `src/data/releases/releases.ts` (synced) |
| **Operator what's new** | gymkhana-cloud `product-docs/whats-new.mdx` (synced) |

## Cut a release

1. **Bump version** in `package.json` (e.g. `0.3.0`).
2. **Add `## [0.3.0] - YYYY-MM-DD`** section to [`CHANGELOG.md`](../CHANGELOG.md) (Keep a Changelog format).
3. **Add matching entry** at the top of [`docs/releases.json`](releases.json) with `changes[]` for portal cards.
4. **Open a PR** to `main` — wait for **CodeRabbit** review and CI (see [PR_REVIEW.md](PR_REVIEW.md)).
5. **Merge**, then tag and push:

```bash
git checkout main && git pull
npm run release:validate
git tag v0.3.0
git push origin v0.3.0
```

6. GitHub Actions [`.github/workflows/release.yml`](../.github/workflows/release.yml) validates metadata and publishes the GitHub Release from `CHANGELOG.md`.

7. In **gymkhana-cloud**, bump the product submodule (or sync workspace) and run:

```bash
cd cloud
npm run sync:releases
```

Commit the updated `releases.ts` and `product-docs/whats-new.mdx`.

## Validation scripts

```bash
npm run release:validate              # current package.json version
npm run release:validate -- --tag v0.2.0
npm run release:notes -- --tag v0.2.0 # print GitHub release body
```

## CodeRabbit

Release PRs must pass the same review gate as feature PRs:

- [CodeRabbit GitHub App](https://github.com/apps/coderabbitai) installed on **gymkhana-fitness-360**
- Config: [`.coderabbit.yaml`](../.coderabbit.yaml) — includes `CHANGELOG.md` and `docs/releases.json` path instructions
- Comment `@coderabbitai review` on the release PR if needed

## Links shown on the portal

All GitHub links on [www.gymkhana.fit](https://www.gymkhana.fit) point to:

**https://github.com/gymkhana-fitness-360/gymkhana**

Set `NEXT_PUBLIC_GITHUB_URL` in cloud only if overriding for a fork.
