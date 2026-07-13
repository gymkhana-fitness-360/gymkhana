import { createApiHandler } from "@/lib/api-handler";
import { postAccountContextHandler } from "@/domains/platform/handlers/account-context";

/** Set active account for dashboard session (multi-org switch). */
export const POST = createApiHandler(
  (_request, { session, body }) => postAccountContextHandler(_request, session!, body),
  { rateLimit: "moderate" },
);
