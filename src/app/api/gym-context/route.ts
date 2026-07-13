import { createApiHandler } from "@/lib/api-handler";
import { postGymContextHandler } from "@/domains/tenancy/handlers/gym-context";

export const POST = createApiHandler(
  (request, { session, body }) => postGymContextHandler(request, session!, body),
  { rateLimit: "moderate" },
);
