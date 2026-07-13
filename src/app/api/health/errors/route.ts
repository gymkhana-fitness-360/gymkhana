import { createApiHandler } from "@/lib/api-handler";
import {
  clearHealthErrorsHandler,
  getHealthErrorsHandler,
} from "@/domains/platform/handlers/health-errors";

export const GET = createApiHandler(async () => getHealthErrorsHandler(), {
  rateLimit: "lenient",
  adminOnly: true,
});

export const DELETE = createApiHandler(async () => clearHealthErrorsHandler(), {
  rateLimit: "strict",
  adminOnly: true,
});
