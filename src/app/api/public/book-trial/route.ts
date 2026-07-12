import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { createLead, convertLeadToTrial } from "@/domains/leads/service";

const bodySchema = z.object({
  slug: z.string().min(2).max(64),
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(15),
  email: z.string().email().optional(),
  notes: z.string().max(500).optional(),
  bookTrial: z.boolean().optional(),
});

/** GTM-M-002: public trial booking by gym slug. */
export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const gym = await prisma.gym.findFirst({
    where: { publicBookSlug: parsed.data.slug },
    select: { id: true, name: true },
  });
  if (!gym) return ApiErrors.notFound("Gym");

  const lead = await createLead(gym.id, {
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    source: "WEBSITE",
    notes: parsed.data.notes ?? "Public book page",
    followUpAt: new Date(),
  });

  if (parsed.data.bookTrial) {
    const trial = await convertLeadToTrial(gym.id, lead.id, null);
    return successResponse(
      {
        success: true,
        leadId: lead.id,
        gymName: gym.name,
        trialVisitId: trial?.trialVisit?.id,
      },
      201,
    );
  }

  return successResponse(
    { success: true, leadId: lead.id, gymName: gym.name },
    201,
  );
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) return ApiErrors.badRequest("slug required");

  const gym = await prisma.gym.findFirst({
    where: { publicBookSlug: slug },
    select: { id: true, name: true, phone: true, address: true },
  });
  if (!gym) return ApiErrors.notFound("Gym");

  return successResponse({ gym });
}
