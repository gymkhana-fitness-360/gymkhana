/**
 * Canonical first-party API paths. Prefer these over ad-hoc string literals so
 * resource URLs stay consistent and refactors stay grep-friendly.
 *
 * Conventions (incremental REST):
 * - Collections: GET/POST `/api/{plural}`
 * - Instance: GET/PUT/PATCH/DELETE `/api/{plural}/[id]`
 * - Procedural / legacy action URLs live under `legacyActions` until migrated.
 */

const enc = encodeURIComponent;

export const apiPaths = {
  members: () => "/api/members",
  member: (id: string) => `/api/members/${enc(id)}`,

  payments: () => "/api/payments",
  payment: (id: string) => `/api/payments/${enc(id)}`,

  plans: () => "/api/plans",
  plan: (id: string) => `/api/plans/${enc(id)}`,

  attendance: () => "/api/attendance",
  attendanceQr: () => "/api/attendance/qr",

  expenses: () => "/api/expenses",
  expense: (id: string) => `/api/expenses/${enc(id)}`,

  challenges: () => "/api/challenges",
  challengeParticipants: () => "/api/challenges/participants",

  dashboardCollections: () => "/api/dashboard/collections",
  analyticsSummary: () => "/api/analytics/summary",
  leaderboard: () => "/api/leaderboard",

  whatsapp: {
    root: "/api/whatsapp",
    initialize: "/api/whatsapp/initialize",
    send: "/api/whatsapp/send",
    sendTemplate: "/api/whatsapp/send-template",
    bulk: "/api/whatsapp/bulk",
    status: "/api/whatsapp/status",
    health: "/api/whatsapp/health",
  },

  /**
   * Cross-resource or verb-heavy routes. For **new** work, prefer:
   * - `POST /api/{collection}/[id]/{sub-resource}` when scoped to one entity, or
   * - `POST /api/operations/{kebab-name}` (add under `src/app/api/operations/`) when not.
   * Keep existing paths until you intentionally version (`/api/v2/...`) and deprecate.
   */
  legacyActions: {
    paymentsQuickEntry: "/api/payments/quick-entry",
    paymentsFromWhatsApp: "/api/payments/from-whatsapp",
    paymentsDeduplicate: "/api/payments/deduplicate",
    renewalsSendReminder: "/api/renewals/send-reminder",
    renewalsSendBulkReminders: "/api/renewals/send-bulk-reminders",
    overdueDetect: "/api/overdue/detect",
  },
} as const;
