import { z } from "zod";
import { createApiHandler } from "@/lib/api-handler";
import { requireApiGymId } from "@/lib/api/gym-context";
import { syncMembershipsFromPayments } from "@/domains/memberships/handlers/sync-memberships-from-payments";
import { NextResponse } from "next/server";

const syncBodySchema = z.object({}).passthrough();

export const POST = createApiHandler(
  async (request, { session, body }) => {
    const gymId = await requireApiGymId(session, request);
    if (gymId instanceof NextResponse) return gymId;
    syncBodySchema.parse(body);
    return syncMembershipsFromPayments(gymId);
  },
  { rateLimit: "moderate", adminOnly: true },
);
