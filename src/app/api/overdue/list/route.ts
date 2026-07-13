import { createApiHandler } from "@/lib/api-handler";
import { requireApiGymId } from "@/lib/api/gym-context";
import { listOverdueRenewalWindow } from "@/domains/collections/handlers/list-overdue-renewal-window";
import { NextResponse } from "next/server";

export const GET = createApiHandler(
  async (request, { session }) => {
    const gymId = await requireApiGymId(session, request);
    if (gymId instanceof NextResponse) return gymId;
    return listOverdueRenewalWindow(gymId);
  },
  { rateLimit: "moderate" },
);
