import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cachedJson } from "@/lib/api-cache";
import { listPlansHandler } from "@/domains/memberships/handlers/list-plans";
import { getPlanQueries } from "@/domains/memberships/adapters";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";

const logger = createLogger("api-plans");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    const response = await listPlansHandler(request, getPlanQueries());
    if (!response.ok) {
      return response;
    }
    const plans = await response.json();
    return cachedJson(plans);
  } catch (error) {
    logger.error("Error fetching plans:", error as Error);
    return ApiErrors.internal("Failed to fetch plans");
  }
}

/**
 * POST /api/plans - Create plan. Admin only.
 */
export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }
    if (session.user.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request)
    );
    if (!gymId) {
      return ApiErrors.validationError("No gym selected or account has no locations.");
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const durationDays = typeof body.durationDays === "number" ? body.durationDays : 0;
    const price = typeof body.price === "number" ? body.price : 0;
    const description = body.description == null || body.description === "" ? null : String(body.description);

    if (!name || durationDays <= 0 || price < 0) {
      return ApiErrors.validationError("name, durationDays (>0), and price (>=0) required");
    }

    const plan = await prisma.plan.create({
      data: {
        id: randomUUID(),
        gymId,
        name,
        durationDays,
        price,
        description,
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    logger.error("Plan POST error:", error as Error);
    return ApiErrors.internal("Failed to create plan");
  }
}
