# Contributing to Fitness360

Thank you for your interest in Fitness360. Contributions are welcome under the [Apache License 2.0](LICENSE).

## Before you start

1. **Search [existing issues](https://github.com/gymkhana-fitness-360/gymkhana/issues)** — avoid duplicate work.
2. **Open an issue first** for large features or architectural changes so maintainers can align on approach.
3. **Read the scope** — this repo is the open-source **product app** only. See [docs/OPEN_CORE.md](docs/OPEN_CORE.md).

## How to contribute

| Type | How |
|------|-----|
| Bug report | [Open a bug](https://github.com/gymkhana-fitness-360/gymkhana/issues/new?template=bug_report.md) using the template |
| Feature request | [Open a feature request](https://github.com/gymkhana-fitness-360/gymkhana/issues/new?template=feature_request.md) |
| Code or docs fix | Fork → branch → PR (see below) |
| Review | Comment on open pull requests |

## Pull requests

**`main` is protected** — all changes must go through a pull request. Direct pushes to `main` are rejected by GitHub (see [docs/BRANCH_POLICY.md](docs/BRANCH_POLICY.md)).

1. Fork or branch from `main` (`feat/…`, `fix/…`, or `docs/…`).
2. Keep each PR **focused** — one bug, feature, or doc change when possible.
3. **Keep `main` production-ready** — experimental prototypes and internal AI/WIP docs belong on feature branches, not `main`.
4. Wait for **CodeRabbit AI review** and resolve all conversations before merging — see [docs/PR_REVIEW.md](docs/PR_REVIEW.md).
5. Ensure **CI passes** on the PR (when required checks are enabled).
6. For releases: see [docs/RELEASES.md](docs/RELEASES.md) and update [CHANGELOG.md](CHANGELOG.md) when shipping user-visible changes.
7. Follow the [development guide](docs/DEVELOPMENT.md) for setup, conventions, and local checks.
8. Fill in the [pull request template](.github/pull_request_template.md).

Optional local guard: `./scripts/install-git-hooks.sh` (blocks accidental `git push origin main`).

### Commit messages (public-friendly)

Use clear, complete sentences. Good examples:

- `fix: correct renewal date when timezone is IST`
- `docs: document self-host env vars in DEVELOPMENT.md`
- `feat(api): add pagination to GET /api/v1/members`

Avoid internal codenames, ticket dumps, or `WIP` / `temp` on commits that will land on `main`.

Maintainers may ask for changes, squash commits, or close PRs that are out of scope.

### What we expect

- Clear PR description (what and why)
- Tests for behavior changes when practical
- No secrets, `.env` files, or real member/payment data
- Documentation updates when user-facing behavior changes
- Respect for existing architecture — see [docs/adr/](docs/adr/) before large structural changes

### Architecture changes

Significant design decisions should be captured as a new ADR in `docs/adr/` (copy an existing file as a template and update `docs/adr/README.md`). Discuss in an issue first when the change is contentious.

## Security

**Do not** open public issues for security vulnerabilities. Use [GitHub Security Advisories](https://github.com/gymkhana-fitness-360/gymkhana/security/advisories/new) (if enabled) or contact the maintainers privately.

## Code of conduct

Be respectful and constructive. Harassment, discrimination, and bad-faith interaction are not tolerated. Maintainers may remove content or block repeat offenders.

## License

By submitting a pull request, you agree that your contributions are licensed under the Apache License 2.0, consistent with the project.
