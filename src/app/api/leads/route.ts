import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { createLead, listLeads } from "@/domains/leads/service";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(15),
  email: z.string().email().optional(),
  source: z
    .enum([
      "WALK_IN",
      "WEBSITE",
      "WHATSAPP",
      "REFERRAL",
      "INSTAGRAM",
      "PHONE_CALL",
      "OTHER",
    ])
    .optional(),
  notes: z.string().max(1000).optional(),
  followUpAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date").optional(),
});

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const { gymId } = await getGymContext(request);
    const status = request.nextUrl.searchParams.get("status");
    const leads = await listLeads(
      gymId,
      status === "NEW" ||
        status === "CONTACTED" ||
        status === "TRIAL_SCHEDULED" ||
        status === "TRIAL_DONE" ||
        status === "CONVERTED" ||
        status === "LOST"
        ? { status }
        : undefined,
    );
    return NextResponse.json({ leads });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to list leads");
  }
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;

  try {
    const { gymId } = await getGymContext(request);
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const parsed = await parseJsonBody(request, createSchema);
    if (!parsed.ok) return parsed.response;

    const lead = await createLead(gymId, {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      source: parsed.data.source,
      notes: parsed.data.notes,
      followUpAt: parsed.data.followUpAt
        ? new Date(parsed.data.followUpAt)
        : undefined,
      assignedToId: session.user.id,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to create lead");
  }
}
