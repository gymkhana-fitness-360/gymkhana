import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { requirePermission, PermissionError } from "@/lib/permissions";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import {
  ALLOWED_MEMBER_PHOTO_TYPES,
  MAX_MEMBER_PHOTO_BYTES,
} from "@/lib/member-avatar";

export async function uploadMemberPhotoHandler(request: NextRequest) {
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

  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request),
  );
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const form = await request.formData();
  const memberId = String(form.get("memberId") ?? "");
  const file = form.get("file");

  if (!memberId) return ApiErrors.badRequest("memberId is required");
  if (!(file instanceof File)) return ApiErrors.badRequest("file is required");

  if (!ALLOWED_MEMBER_PHOTO_TYPES.has(file.type)) {
    return ApiErrors.badRequest("Unsupported image type");
  }
  if (file.size > MAX_MEMBER_PHOTO_BYTES) {
    return ApiErrors.badRequest(`Image must be under ${MAX_MEMBER_PHOTO_BYTES / 1024}KB`);
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId, deletedAt: null },
  });
  if (!member) return ApiErrors.notFound("Member not found");

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  const updated = await prisma.member.update({
    where: { id: memberId },
    data: { photo: dataUrl },
    select: { id: true, photo: true },
  });

  return NextResponse.json(updated);
}
