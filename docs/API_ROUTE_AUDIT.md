# API route audit

Auto-generated route inventory (`npm run audit:api-routes`). Regenerate after API changes.

**Generated:** 2026-07-13  
**Routes:** 169 · **Migrated:** 140 · **Partial:** 29 · **Direct Prisma:** 0

Regenerate: `npm run audit:api-routes`

| Route | Domain | Prisma in route | Domain import | Status |
|-------|--------|-----------------|---------------|--------|
| `/api/account-context` | platform | no | yes | migrated |
| `/api/accounts` | platform | no | yes | migrated |
| `/api/admin/attendance/reassign-date` | platform | no | yes | migrated |
| `/api/admin/backdate-late-payments` | platform | no | yes | migrated |
| `/api/admin/fix-stale-overdue` | platform | no | yes | migrated |
| `/api/admin/tasks` | platform | yes | yes | partial |
| `/api/admin/wa-log` | platform | no | yes | migrated |
| `/api/agent/v1/health` | platform | no | yes | migrated |
| `/api/agent/v1/tools/[name]` | platform | no | yes | migrated |
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
| `/api/assistant` | platform | no | yes | migrated |
| `/api/assistant/config` | platform | no | yes | migrated |
| `/api/attendance` | attendance | no | yes | migrated |
| `/api/attendance/bootstrap` | attendance | yes | yes | partial |
| `/api/attendance/bootstrap/secondary` | attendance | yes | yes | partial |
| `/api/attendance/call-list` | attendance | yes | yes | partial |
| `/api/attendance/qr` | attendance | no | yes | migrated |
| `/api/audit` | admin | no | yes | migrated |
| `/api/auth/[...nextauth]` | identity | no | yes | migrated |
| `/api/auth/password-reset` | identity | no | yes | migrated |
| `/api/auth/signup` | identity | no | yes | migrated |
| `/api/bills` | billing | no | yes | migrated |
| `/api/bills/[id]` | billing | yes | yes | partial |
| `/api/bills/[id]/allocate` | billing | no | yes | migrated |
| `/api/bills/[id]/pdf` | billing | yes | yes | partial |
| `/api/bills/[id]/refund` | billing | no | yes | migrated |
| `/api/bills/templates` | billing | no | yes | migrated |
| `/api/campaigns` | platform | yes | yes | partial |
| `/api/campaigns/[id]/send` | platform | no | yes | migrated |
| `/api/campaigns/probe` | platform | no | yes | migrated |
| `/api/challenges` | engagement | no | yes | migrated |
| `/api/challenges/participants` | engagement | no | yes | migrated |
| `/api/classes` | platform | no | yes | migrated |
| `/api/classes/[id]/bookings` | platform | no | yes | migrated |
| `/api/commerce/gym-gst` | platform | no | yes | migrated |
| `/api/commerce/invoices` | platform | no | yes | migrated |
| `/api/commerce/invoices/[id]` | platform | no | yes | migrated |
| `/api/commerce/order-lines` | platform | yes | yes | partial |
| `/api/commerce/products` | platform | no | yes | migrated |
| `/api/commerce/products/[id]` | platform | no | yes | migrated |
| `/api/commerce/products/[id]/marketplace-reference` | platform | no | yes | migrated |
| `/api/communications/events` | platform | no | yes | migrated |
| `/api/cron/daily-overdue-report` | platform-jobs | no | yes | migrated |
| `/api/cron/db-backup` | platform-jobs | no | yes | migrated |
| `/api/cron/overdue-cleanup` | platform-jobs | no | yes | migrated |
| `/api/cron/refresh-daily-stats` | platform-jobs | no | yes | migrated |
| `/api/cron/unified` | platform-jobs | no | yes | migrated |
| `/api/cron/update-membership` | platform-jobs | no | yes | migrated |
| `/api/custom-analytics` | platform | no | yes | migrated |
| `/api/custom-analytics/[slug]/run` | platform | no | yes | migrated |
| `/api/custom-entities` | platform | no | yes | migrated |
| `/api/custom-entities/[id]/records` | platform | no | yes | migrated |
| `/api/dashboard/collections` | analytics | no | yes | migrated |
| `/api/dashboard/sidebar-counts` | analytics | no | yes | migrated |
| `/api/diet-assignments/[id]/compliance` | platform | yes | yes | partial |
| `/api/errors` | platform | no | yes | migrated |
| `/api/expenses` | finance | no | yes | migrated |
| `/api/expenses/[id]` | finance | yes | yes | partial |
| `/api/expenses/[id]/mark-paid` | finance | yes | yes | partial |
| `/api/free-trial-visits` | platform | no | yes | migrated |
| `/api/free-trial-visits/[id]` | platform | no | yes | migrated |
| `/api/goals` | platform | no | yes | migrated |
| `/api/gym-context` | tenancy | no | yes | migrated |
| `/api/gym/profile` | platform | yes | yes | partial |
| `/api/gyms` | tenancy | no | yes | migrated |
| `/api/health` | platform | no | yes | migrated |
| `/api/health/errors` | platform | no | yes | migrated |
| `/api/inngest` | platform-jobs | no | yes | migrated |
| `/api/intelligence/gym-facts` | platform | yes | yes | partial |
| `/api/leaderboard` | engagement | no | yes | migrated |
| `/api/leads` | platform | no | yes | migrated |
| `/api/leads/[id]` | platform | yes | yes | partial |
| `/api/leads/[id]/book-trial` | platform | no | yes | migrated |
| `/api/leads/[id]/follow-ups` | platform | yes | yes | partial |
| `/api/leads/follow-up` | platform | no | yes | migrated |
| `/api/leads/inbound` | platform | yes | yes | partial |
| `/api/marketplace` | platform | no | yes | migrated |
| `/api/marketplace/[slug]` | platform | no | yes | migrated |
| `/api/mcp` | platform | no | yes | migrated |
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
| `/api/members/photo` | members | no | yes | migrated |
| `/api/members/photo/generate` | members | no | yes | migrated |
| `/api/messaging/kanban` | platform | no | yes | migrated |
| `/api/notifications/inbox` | platform | no | yes | migrated |
| `/api/oauth/token` | platform | no | yes | migrated |
| `/api/offers` | platform | no | yes | migrated |
| `/api/offers/suggest-quiet` | platform | no | yes | migrated |
| `/api/opportunities` | platform | no | yes | migrated |
| `/api/opportunities/chase-plan` | platform | no | yes | migrated |
| `/api/overdue` | collections | no | yes | migrated |
| `/api/overdue/[id]` | collections | no | yes | migrated |
| `/api/overdue/detect` | collections | yes | yes | partial |
| `/api/overdue/list` | collections | no | yes | migrated |
| `/api/payments` | payments | no | yes | migrated |
| `/api/payments/[id]` | payments | no | yes | migrated |
| `/api/payments/[id]/send-bill` | payments | no | yes | migrated |
| `/api/payments/deduplicate` | payments | no | yes | migrated |
| `/api/payments/fix-missing-memberships` | payments | no | yes | migrated |
| `/api/payments/from-whatsapp` | payments | no | yes | migrated |
| `/api/payments/future-membership-stack-cleanup` | payments | no | yes | migrated |
| `/api/payments/quick-entry` | payments | no | yes | migrated |
| `/api/payments/razorpay/create-link` | payments | no | yes | migrated |
| `/api/payments/sent-status` | payments | no | yes | migrated |
| `/api/payments/sync-memberships` | payments | no | yes | migrated |
| `/api/plans` | memberships | yes | yes | partial |
| `/api/plans/[id]` | memberships | no | yes | migrated |
| `/api/predictions/refresh` | platform | no | yes | migrated |
| `/api/public/book-trial` | platform | yes | yes | partial |
| `/api/public/member-pay` | platform | no | yes | migrated |
| `/api/reminders` | communications | no | yes | migrated |
| `/api/reminders/history` | communications | no | yes | migrated |
| `/api/reminders/unpaid` | communications | no | yes | migrated |
| `/api/renewals` | memberships | no | yes | migrated |
| `/api/renewals/reminder-candidates` | memberships | no | yes | migrated |
| `/api/renewals/send-bulk-reminders` | memberships | no | yes | migrated |
| `/api/renewals/send-reminder` | memberships | no | yes | migrated |
| `/api/restore/[entity]/[id]` | platform | no | yes | migrated |
| `/api/salaries` | finance | no | yes | migrated |
| `/api/salaries/[id]` | finance | yes | yes | partial |
| `/api/services` | platform | no | yes | migrated |
| `/api/settings` | admin | no | yes | migrated |
| `/api/settings/agent-clients` | admin | no | yes | migrated |
| `/api/settings/agent-clients/[clientId]` | admin | no | yes | migrated |
| `/api/settings/agent-clients/[clientId]/token` | admin | no | yes | migrated |
| `/api/settings/agent-clients/connect` | admin | no | yes | migrated |
| `/api/settings/agent-clients/test` | admin | no | yes | migrated |
| `/api/settings/notifications` | admin | yes | yes | partial |
| `/api/settings/session` | admin | yes | yes | partial |
| `/api/settings/whatsapp-lifecycle-templates` | admin | no | yes | migrated |
| `/api/trainers/commissions` | trainers | yes | yes | partial |
| `/api/trainers/leaderboard` | trainers | no | yes | migrated |
| `/api/trials/active` | platform | no | yes | migrated |
| `/api/undo` | platform | no | yes | migrated |
| `/api/users` | admin | no | yes | migrated |
| `/api/users/[id]` | admin | no | yes | migrated |
| `/api/v1/analytics/cashflow` | platform | no | yes | migrated |
| `/api/v1/members` | platform | no | yes | migrated |
| `/api/validate` | platform | no | yes | migrated |
| `/api/webhooks/razorpay` | platform | no | yes | migrated |
| `/api/whatsapp/bulk` | communications | no | yes | migrated |
| `/api/whatsapp/campaigns` | communications | yes | yes | partial |
| `/api/whatsapp/health` | communications | no | yes | migrated |
| `/api/whatsapp/initialize` | communications | no | yes | migrated |
| `/api/whatsapp/member/[phone]` | communications | no | yes | migrated |
| `/api/whatsapp/send` | communications | no | yes | migrated |
| `/api/whatsapp/send-template` | communications | no | yes | migrated |
| `/api/whatsapp/status` | communications | no | yes | migrated |
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
