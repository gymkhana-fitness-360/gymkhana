import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sendRenewalReminders } from "@/inngest/functions";
import { processOutboxEvents } from "@/inngest/outbox-functions";
import { handleDomainEvents } from "@/inngest/domain-event-handlers";
import { generateDailyOpportunities } from "@/inngest/opportunity-functions";
import { refreshDailyGymFacts } from "@/inngest/gym-fact-functions";
import { autonomousRecoveryQueue } from "@/inngest/autonomous-recovery-functions";
import {
  sendWhatsAppMessage,
  sendBulkWhatsAppMessages,
  initializeWhatsApp,
} from "@/inngest/whatsapp-functions";
import {
  monitorAndHealErrors,
  autoFixBuildError,
  healthCheck,
} from "@/inngest/error-monitor-functions";
import { runLifecycleMaintenanceCron } from "@/inngest/lifecycle-cron-functions";
import { isDevSelfHealEnabled } from "@/lib/app-env";

const devSelfHealFunctions = isDevSelfHealEnabled()
  ? [monitorAndHealErrors, autoFixBuildError]
  : [];

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendRenewalReminders,
    processOutboxEvents,
    handleDomainEvents,
    generateDailyOpportunities,
    refreshDailyGymFacts,
    autonomousRecoveryQueue,
    sendWhatsAppMessage,
    sendBulkWhatsAppMessages,
    initializeWhatsApp,
    ...devSelfHealFunctions,
    healthCheck,
    runLifecycleMaintenanceCron,
  ],
});
