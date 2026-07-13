import { createApiHandler } from "@/lib/api-handler";
import { listAccountsHandler } from "@/domains/platform/handlers/accounts";

/** List accounts the signed-in user belongs to (franchise / agency multi-org). */
export const GET = createApiHandler(
  (request, { session }) => listAccountsHandler(request, session!),
  { rateLimit: "moderate" },
);
