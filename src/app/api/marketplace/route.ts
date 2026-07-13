import { createApiHandler } from "@/lib/api-handler";
import { listMarketplaceHandler } from "@/domains/platform/marketplace/list";

export const GET = createApiHandler(
  (request, { session }) => listMarketplaceHandler(request, session!),
  { rateLimit: "lenient", permission: "canEditMembers" },
);
