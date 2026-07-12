# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in Fitness360, **please do not open a
public GitHub issue.** Instead, report it privately:

- Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)
  ("Report a vulnerability" under the repository's **Security** tab), or
- Email the maintainers at the security contact configured in
  `src/lib/legal/content.ts` (`LEGAL_CONTACT_EMAIL`).

Please include:

- A description of the issue and its impact
- Steps to reproduce (proof of concept if possible)
- Affected version / commit

We will acknowledge your report, keep you updated on remediation, and credit you
once a fix is released (unless you prefer to remain anonymous).

## Supported versions

This project is under active development. Security fixes are applied to the
latest `main` branch.

## Scope & hardening notes

For the application's security model (auth, tenant isolation, API auth classes,
environment handling) and the known hardening roadmap, see
[docs/SECURITY.md](docs/SECURITY.md).

Operators are responsible for deploying with strong secrets, HTTPS, and a
properly scoped database. Never deploy with `ALLOW_DEMO_ACCOUNT_AUTO_LINK=true`
in production.
