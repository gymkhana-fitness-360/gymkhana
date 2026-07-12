import { inngest } from "./client";
import { createLogger } from "@/lib/logger";

const logger = createLogger("app");

/**
 * Background job: Send WhatsApp message
 * DISABLED FOR DEPLOYMENT - WhatsApp integration requires local setup
 */
export const sendWhatsAppMessage = inngest.createFunction(
  { id: "send-whatsapp-message" },
  { event: "whatsapp/message.send" },
  async ({ event }) => {
    logger.info("WhatsApp is disabled for deployment");
    return { success: false, error: "WhatsApp is disabled" };
  }
);

/**
 * Background job: Send bulk WhatsApp messages
 * DISABLED FOR DEPLOYMENT - WhatsApp integration requires local setup
 */
export const sendBulkWhatsAppMessages = inngest.createFunction(
  { id: "send-bulk-whatsapp-messages" },
  { event: "whatsapp/bulk.send" },
  async ({ event }) => {
    logger.info("WhatsApp is disabled for deployment");
    return { success: false, error: "WhatsApp is disabled" };
  }
);

/**
 * Background job: Initialize WhatsApp service
 * DISABLED FOR DEPLOYMENT - WhatsApp integration requires local setup
 */
export const initializeWhatsApp = inngest.createFunction(
  { id: "initialize-whatsapp" },
  { event: "whatsapp/initialize.requested" },
  async ({ event }) => {
    logger.info("WhatsApp is disabled for deployment");
    return { success: false, error: "WhatsApp is disabled" };
  }
);
