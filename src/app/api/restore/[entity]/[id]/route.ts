import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { ApiErrors } from "@/lib/api-handler";

type Entity = "member" | "bill" | "lead";

function parseEntity(value: string): Entity | null {
  if (value === "member" || value === "bill" || value === "lead") return value;
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin required");

  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request)
  );
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const { entity: entityRaw, id } = await params;
  const entity = parseEntity(entityRaw);
  if (!entity) return ApiErrors.validationError("Unknown entity");

  if (entity === "member") {
    const updated = await prisma.member.updateMany({
      where: { id, gymId },
      data: { deletedAt: null },
    });
    if (!updated.count) return ApiErrors.notFound("Member");
    return NextResponse.json({ success: true });
  }

  if (entity === "bill") {
    const updated = await prisma.bill.updateMany({
      where: { id, gymId },
      data: { deletedAt: null },
    });
    if (!updated.count) return ApiErrors.notFound("Bill");
    return NextResponse.json({ success: true });
  }

  if (entity === "lead") {
    const updated = await prisma.lead.updateMany({
      where: { id, gymId },
      data: { deletedAt: null },
    });
    if (!updated.count) return ApiErrors.notFound("Lead");
    return NextResponse.json({ success: true });
  }

  return ApiErrors.validationError("Unknown entity");
}
