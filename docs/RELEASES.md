# Publishing releases

Releases are tagged on the **product** repo (`gymkhana-fitness-360/gymkhana`).

## Checklist

1. Bump `package.json` `version`.
2. Update [CHANGELOG.md](../CHANGELOG.md) (Keep a Changelog format).
3. Add [docs/releases/vX.Y.Z.md](releases/) from [.github/RELEASE_TEMPLATE.md](../.github/RELEASE_TEMPLATE.md).
4. Update [docs/FEATURE_PARITY.md](../FEATURE_PARITY.md) if capabilities changed.
5. Update gymkhana-cloud `src/data/releases/releases.ts` and `feature-parity.ts` (live docs).
6. Run checks: `npm run typecheck`, `npm run test:ci`, `npm run build`.
7. Merge to `main`, then tag and publish:

```bash
git tag -a v0.2.0 -m "v0.2.0 — Extensions, member photos & documentation"
git push origin v0.2.0

gh release create v0.2.0 \
  --title "v0.2.0 — Extensions, member photos & documentation" \
  --notes-file docs/releases/v0.2.0.md
```

## Where release info appears

| Surface | URL / path |
|---------|------------|
| GitHub Releases | https://github.com/gymkhana-fitness-360/gymkhana/releases |
| Changelog (repo) | `CHANGELOG.md` |
| Developer release notes | https://www.gymkhana.fit/developers#releases |
| Operator feature updates | https://www.gymkhana.fit/docs/updates |
| Feature parity matrix | https://www.gymkhana.fit/developers#featureParity |

Cloud deploy is separate; product tags track the OSS app only.
