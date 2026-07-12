import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { prisma } from "@/lib/prisma";
import { createLead } from "@/domains/leads/service";

/** Public enquiry capture (website / landing embed). Rate-limited; gymId required. */
const inboundSchema = z.object({
  gymId: z.string().uuid(),
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(15),
  email: z.string().email().optional(),
  notes: z.string().max(500).optional(),
  source: z.enum(["WEBSITE", "INSTAGRAM", "REFERRAL", "OTHER"]).optional(),
});

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const parsed = await parseJsonBody(request, inboundSchema);
    if (!parsed.ok) return parsed.response;

    const gym = await prisma.gym.findUnique({
      where: { id: parsed.data.gymId },
      select: { id: true },
    });
    if (!gym) return ApiErrors.notFound("Gym");

    const lead = await createLead(parsed.data.gymId, {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      source: parsed.data.source ?? "WEBSITE",
      notes: parsed.data.notes,
    });

    return NextResponse.json(
      { success: true, leadId: lead.id },
      { status: 201 },
    );
  } catch {
    return ApiErrors.internal("Failed to submit enquiry");
  }
}
