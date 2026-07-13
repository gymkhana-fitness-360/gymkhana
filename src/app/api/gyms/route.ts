import { createApiHandler } from "@/lib/api-handler";
import { listGymsHandler } from "@/domains/tenancy/handlers/gyms";

export const GET = createApiHandler(
  (request, { session }) => listGymsHandler(request, session!),
  { rateLimit: "lenient" },
);
