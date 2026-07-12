# Feature parity

What is available in the **dashboard**, via **REST API**, through **MCP agent tools**, and when **self-hosting** the OSS product.

**Interactive matrix (updated each release):** [gymkhana.fit/developers#featureParity](https://www.gymkhana.fit/developers#featureParity)

| Feature | Dashboard | API | MCP | Self-host | Notes |
|---------|-----------|-----|-----|-----------|-------|
| Members & renewals | ✅ | ✅ | ✅ | ✅ | |
| Member profile photos | ✅ | ✅ | — | ✅ | Upload or generate avatar |
| Payments & collections | ✅ | ✅ | Planned | ✅ | |
| Bills & invoicing | ✅ | ✅ | — | ✅ | |
| Attendance & QR | ✅ | ✅ | — | ✅ | |
| Dashboard analytics | ✅ | ✅ | — | ✅ | |
| Custom analytics | Planned | ✅ | Planned | ✅ | API-first in v0.2.0 |
| Custom entities | Planned | ✅ | Planned | ✅ | API-first in v0.2.0 |
| WhatsApp reminders & campaigns | ✅ | ✅ | ✅ | ✅ | Requires Meta WABA |
| Leads & follow-ups | ✅ | ✅ | — | ✅ | |
| Marketplace installs | ✅ | Partial | — | ✅ | |
| Agent / MCP tools | ✅ | ✅ | ✅ | ✅ | Settings → AI & MCP |
| Public REST v1 | — | Preview | — | ✅ | `x-api-key` |
| Outbound webhooks | Planned | Planned | — | Planned | In progress |
| Multi-gym / multi-location | ✅ | ✅ | ✅ | ✅ | |
| Signup & OAuth login | ✅ | ✅ | — | ✅ | |

**Legend:** ✅ Available · Preview = early API · Planned = on roadmap · — = not applicable

When adding a feature, update this file and `cloud/src/data/releases/feature-parity.ts` (source for the live matrix).
