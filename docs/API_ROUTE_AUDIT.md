# API route audit

Auto-generated route inventory (`npm run audit:api-routes`). Regenerate after API changes.

**Generated:** 2026-07-13  
**Routes:** 169 · **Migrated:** 80 · **Partial:** 29 · **Direct Prisma:** 60

Regenerate: `npm run audit:api-routes`

| Route | Domain | Prisma in route | Domain import | Status |
|-------|--------|-----------------|---------------|--------|
| `/api/account-context` | platform | no | no | direct-prisma |
| `/api/accounts` | platform | no | no | direct-prisma |
| `/api/admin/attendance/reassign-date` | platform | no | yes | migrated |
| `/api/admin/backdate-late-payments` | platform | no | yes | migrated |
| `/api/admin/fix-stale-overdue` | platform | no | yes | migrated |
| `/api/admin/tasks` | platform | yes | yes | partial |
| `/api/admin/wa-log` | platform | no | yes | migrated |
| `/api/agent/v1/health` | platform | no | no | direct-prisma |
| `/api/agent/v1/tools/[name]` | platform | no | no | direct-prisma |
| `/api/agent/v1/tools/overdue` | platform | no | yes | migrated |
| `/api/agents/profiles` | platform | no | yes | migrated |
| `/api/ai/whatsapp/draft-engagement` | platform | yes | yes | partial |
| `/api/ai/whatsapp/draft-reminder` | platform | yes | yes | partial |
| `/api/analytics/attendance-heatmap` | analytics | no | yes | migrated |
| `/api/analytics/cashflow` | analytics | no | yes | migrated |
| `/api/analytics/member-readiness` | analytics | no | yes | migrated |
| `/api/analytics/payment-timing` | analytics | no | yes | migrated |
| `/api/analytics/summary` | analytics | no | yes | migrated |
| `/api/approvals` | platform | no | yes | migrated |
| `/api/assistant` | platform | no | no | direct-prisma |
| `/api/assistant/config` | platform | no | no | direct-prisma |
| `/api/attendance` | attendance | no | yes | migrated |
| `/api/attendance/bootstrap` | attendance | yes | yes | partial |
| `/api/attendance/bootstrap/secondary` | attendance | yes | yes | partial |
| `/api/attendance/call-list` | attendance | yes | yes | partial |
| `/api/attendance/qr` | attendance | no | yes | migrated |
| `/api/audit` | admin | yes | no | direct-prisma |
| `/api/auth/[...nextauth]` | identity | no | no | direct-prisma |
| `/api/auth/password-reset` | identity | yes | no | direct-prisma |
| `/api/auth/signup` | identity | yes | no | direct-prisma |
| `/api/bills` | billing | no | yes | migrated |
| `/api/bills/[id]` | billing | yes | yes | partial |
| `/api/bills/[id]/allocate` | billing | no | yes | migrated |
| `/api/bills/[id]/pdf` | billing | yes | yes | partial |
| `/api/bills/[id]/refund` | billing | no | yes | migrated |
| `/api/bills/templates` | billing | yes | no | direct-prisma |
| `/api/campaigns` | platform | yes | yes | partial |
| `/api/campaigns/[id]/send` | platform | no | yes | migrated |
| `/api/campaigns/probe` | platform | no | yes | migrated |
| `/api/challenges` | engagement | no | yes | migrated |
| `/api/challenges/participants` | engagement | yes | no | direct-prisma |
| `/api/classes` | platform | yes | no | direct-prisma |
| `/api/classes/[id]/bookings` | platform | yes | no | direct-prisma |
| `/api/commerce/gym-gst` | platform | yes | no | direct-prisma |
| `/api/commerce/invoices` | platform | no | yes | migrated |
| `/api/commerce/invoices/[id]` | platform | no | yes | migrated |
| `/api/commerce/order-lines` | platform | yes | yes | partial |
| `/api/commerce/products` | platform | no | yes | migrated |
| `/api/commerce/products/[id]` | platform | no | yes | migrated |
| `/api/commerce/products/[id]/marketplace-reference` | platform | no | yes | migrated |
| `/api/communications/events` | platform | no | yes | migrated |
| `/api/cron/daily-overdue-report` | platform-jobs | no | no | direct-prisma |
| `/api/cron/db-backup` | platform-jobs | no | no | direct-prisma |
| `/api/cron/overdue-cleanup` | platform-jobs | no | no | direct-prisma |
| `/api/cron/refresh-daily-stats` | platform-jobs | no | no | direct-prisma |
| `/api/cron/unified` | platform-jobs | no | yes | migrated |
| `/api/cron/update-membership` | platform-jobs | no | no | direct-prisma |
| `/api/custom-analytics` | platform | no | yes | migrated |
| `/api/custom-analytics/[slug]/run` | platform | no | yes | migrated |
| `/api/custom-entities` | platform | no | yes | migrated |
| `/api/custom-entities/[id]/records` | platform | no | yes | migrated |
| `/api/dashboard/collections` | analytics | no | yes | migrated |
| `/api/dashboard/sidebar-counts` | analytics | yes | no | direct-prisma |
| `/api/diet-assignments/[id]/compliance` | platform | yes | yes | partial |
| `/api/errors` | platform | no | no | direct-prisma |
| `/api/expenses` | finance | no | yes | migrated |
| `/api/expenses/[id]` | finance | yes | yes | partial |
| `/api/expenses/[id]/mark-paid` | finance | yes | yes | partial |
| `/api/free-trial-visits` | platform | no | yes | migrated |
| `/api/free-trial-visits/[id]` | platform | no | yes | migrated |
| `/api/goals` | platform | no | yes | migrated |
| `/api/gym-context` | tenancy | no | no | direct-prisma |
| `/api/gym/profile` | platform | yes | yes | partial |
| `/api/gyms` | tenancy | no | no | direct-prisma |
| `/api/health` | platform | yes | no | direct-prisma |
| `/api/health/errors` | platform | no | no | direct-prisma |
| `/api/inngest` | platform-jobs | no | no | direct-prisma |
| `/api/intelligence/gym-facts` | platform | yes | yes | partial |
| `/api/leaderboard` | engagement | yes | no | direct-prisma |
| `/api/leads` | platform | no | yes | migrated |
| `/api/leads/[id]` | platform | yes | yes | partial |
| `/api/leads/[id]/book-trial` | platform | no | yes | migrated |
| `/api/leads/[id]/follow-ups` | platform | yes | yes | partial |
| `/api/leads/follow-up` | platform | no | yes | migrated |
| `/api/leads/inbound` | platform | yes | yes | partial |
| `/api/marketplace` | platform | no | no | direct-prisma |
| `/api/marketplace/[slug]` | platform | yes | no | direct-prisma |
| `/api/mcp` | platform | no | no | direct-prisma |
| `/api/member/otp/send` | platform | no | yes | migrated |
| `/api/member/otp/verify` | platform | no | yes | migrated |
| `/api/member/supplements` | platform | yes | yes | partial |
| `/api/member/supplements/[productId]/reference` | platform | no | yes | migrated |
| `/api/members` | members | no | yes | migrated |
| `/api/members/[id]` | members | no | yes | migrated |
| `/api/members/[id]/communications` | members | yes | yes | partial |
| `/api/members/[id]/diet-plan` | members | yes | yes | partial |
| `/api/members/[id]/insights` | members | no | yes | migrated |
| `/api/members/fix-date` | members | no | yes | migrated |
| `/api/members/fix-expiry` | members | no | yes | migrated |
| `/api/members/photo` | members | yes | no | direct-prisma |
| `/api/members/photo/generate` | members | yes | no | direct-prisma |
| `/api/messaging/kanban` | platform | no | yes | migrated |
| `/api/notifications/inbox` | platform | yes | no | direct-prisma |
| `/api/oauth/token` | platform | no | no | direct-prisma |
| `/api/offers` | platform | no | yes | migrated |
| `/api/offers/suggest-quiet` | platform | no | yes | migrated |
| `/api/opportunities` | platform | no | yes | migrated |
| `/api/opportunities/chase-plan` | platform | no | yes | migrated |
| `/api/overdue` | collections | no | yes | migrated |
| `/api/overdue/[id]` | collections | yes | no | direct-prisma |
| `/api/overdue/detect` | collections | yes | yes | partial |
| `/api/overdue/list` | collections | yes | no | direct-prisma |
| `/api/payments` | payments | no | yes | migrated |
| `/api/payments/[id]` | payments | no | yes | migrated |
| `/api/payments/[id]/send-bill` | payments | no | yes | migrated |
| `/api/payments/deduplicate` | payments | no | yes | migrated |
| `/api/payments/fix-missing-memberships` | payments | no | yes | migrated |
| `/api/payments/from-whatsapp` | payments | no | yes | migrated |
| `/api/payments/future-membership-stack-cleanup` | payments | no | yes | migrated |
| `/api/payments/quick-entry` | payments | no | yes | migrated |
| `/api/payments/razorpay/create-link` | payments | yes | no | direct-prisma |
| `/api/payments/sent-status` | payments | no | yes | migrated |
| `/api/payments/sync-memberships` | payments | yes | no | direct-prisma |
| `/api/plans` | memberships | yes | yes | partial |
| `/api/plans/[id]` | memberships | no | yes | migrated |
| `/api/predictions/refresh` | platform | no | yes | migrated |
| `/api/public/book-trial` | platform | yes | yes | partial |
| `/api/public/member-pay` | platform | yes | no | direct-prisma |
| `/api/reminders` | communications | yes | no | direct-prisma |
| `/api/reminders/history` | communications | no | yes | migrated |
| `/api/reminders/unpaid` | communications | no | yes | migrated |
| `/api/renewals` | memberships | no | yes | migrated |
| `/api/renewals/reminder-candidates` | memberships | no | yes | migrated |
| `/api/renewals/send-bulk-reminders` | memberships | no | yes | migrated |
| `/api/renewals/send-reminder` | memberships | no | yes | migrated |
| `/api/restore/[entity]/[id]` | platform | yes | no | direct-prisma |
| `/api/salaries` | finance | yes | no | direct-prisma |
| `/api/salaries/[id]` | finance | yes | yes | partial |
| `/api/services` | platform | yes | no | direct-prisma |
| `/api/settings` | admin | no | yes | migrated |
| `/api/settings/agent-clients` | admin | no | no | direct-prisma |
| `/api/settings/agent-clients/[clientId]` | admin | no | no | direct-prisma |
| `/api/settings/agent-clients/[clientId]/token` | admin | no | no | direct-prisma |
| `/api/settings/agent-clients/connect` | admin | no | no | direct-prisma |
| `/api/settings/agent-clients/test` | admin | no | no | direct-prisma |
| `/api/settings/notifications` | admin | yes | yes | partial |
| `/api/settings/session` | admin | yes | yes | partial |
| `/api/settings/whatsapp-lifecycle-templates` | admin | no | yes | migrated |
| `/api/trainers/commissions` | trainers | yes | yes | partial |
| `/api/trainers/leaderboard` | trainers | no | yes | migrated |
| `/api/trials/active` | platform | no | yes | migrated |
| `/api/undo` | platform | no | no | direct-prisma |
| `/api/users` | admin | yes | no | direct-prisma |
| `/api/users/[id]` | admin | yes | no | direct-prisma |
| `/api/v1/analytics/cashflow` | platform | no | yes | migrated |
| `/api/v1/members` | platform | yes | no | direct-prisma |
| `/api/validate` | platform | no | no | direct-prisma |
| `/api/webhooks/razorpay` | platform | yes | no | direct-prisma |
| `/api/whatsapp/bulk` | communications | no | yes | migrated |
| `/api/whatsapp/campaigns` | communications | yes | yes | partial |
| `/api/whatsapp/health` | communications | no | no | direct-prisma |
| `/api/whatsapp/initialize` | communications | no | no | direct-prisma |
| `/api/whatsapp/member/[phone]` | communications | yes | no | direct-prisma |
| `/api/whatsapp/send` | communications | no | yes | migrated |
| `/api/whatsapp/send-template` | communications | no | no | direct-prisma |
| `/api/whatsapp/status` | communications | no | no | direct-prisma |
| `/api/whatsapp/templates` | communications | no | yes | migrated |
| `/api/whatsapp/templates/[id]` | communications | no | yes | migrated |
| `/api/workouts` | workouts | no | yes | migrated |

## M0.3 priority (next 15)

1. `/api/plans` GET — done
2. `/api/members` GET — done (`listMembersHandler` + API mapper)
3. `/api/payments` GET — done (full list + stats DTO)
4. `/api/renewals/reminder-candidates` — done (gym-scoped)
5. `/api/attendance` POST — done (`recordAttendanceHandler`)
6. `/api/whatsapp/send` POST — done (`sendWhatsAppHandler`)
7. `/api/members/[id]` GET — done (`getMemberApiDetail`)
8. `/api/attendance` GET — done (gym-scoped list)
9. `/api/attendance/qr` GET+POST — done
10. `/api/reminders/history` — done (gym-scoped ReminderLog)
11. `/api/reminders/unpaid` — done (gym-scoped)
12. `/api/members` POST — done (`admitMemberHandler`)
13. `/api/payments` POST — done (`createPaymentHandler`)
14. `/api/plans/[id]` PUT/DELETE — done (gym-scoped)
15. `/api/payments/quick-entry` — logic in `domains/payments/services`

## Next batch

1. `/api/overdue/list` — collections domain
2. `/api/analytics/summary` — analytics worker prep
3. `/api/members/[id]` PUT — `updateMemberHandler`
4. `/api/payments/[id]` PATCH/DELETE
5. `/api/plans` POST — create plan command
