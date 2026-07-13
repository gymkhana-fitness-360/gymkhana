import { createApiHandler } from "@/lib/api-handler";
import { validateEnvHandler } from "@/domains/platform/handlers/validate-env";

export const GET = createApiHandler(
  async () => validateEnvHandler(),
  { rateLimit: "lenient" },
);
