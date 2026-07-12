/**
 * Single outbound communications port for WhatsApp and reminder sends (GYM-M2-002).
 * Routes and other domains must use this module instead of calling lib/whatsapp directly.
 */
export { getWhatsAppDirectMessaging } from "./adapters";
export { sendWhatsAppHandler } from "./handlers/send-whatsapp";
export type { IWhatsAppDirectMessaging } from "./interfaces";
