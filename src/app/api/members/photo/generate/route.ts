import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requirePermission, PermissionError } from "@/lib/permissions";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { buildMemberAvatarUrl } from "@/lib/member-avatar";

const bodySchema = z.object({
  memberId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  try {
    requirePermission(session, "canEditMembers");
  } catch (error) {
    if (error instanceof PermissionError) {
      return ApiErrors.forbidden("Permission denied: cannot edit members");
    }
    throw error;
  }

  const gymId = await resolveGymIdForUser(session.user.id, readRequestedGymIdFromRequest(request));
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const member = await prisma.member.findFirst({
    where: { id: parsed.data.memberId, gymId, deletedAt: null },
  });
  if (!member) return ApiErrors.notFound("Member not found");

  const photo = buildMemberAvatarUrl(member.name, member.id);

  const updated = await prisma.member.update({
    where: { id: member.id },
    data: { photo },
    select: { id: true, photo: true, name: true },
  });

  return NextResponse.json(updated);
}
