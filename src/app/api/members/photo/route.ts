import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request)
  );
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const form = await request.formData();
  const memberId = form.get("memberId");
  const file = form.get("photo");

  if (typeof memberId !== "string" || !(file instanceof File)) {
    return ApiErrors.validationError("memberId and photo file required");
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId, deletedAt: null },
  });
  if (!member) return ApiErrors.notFound("Member");

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "jpg";
  const dir = path.join(process.cwd(), "public", "uploads", "members");
  await mkdir(dir, { recursive: true });
  const filename = `${memberId}.${ext}`;
  await writeFile(path.join(dir, filename), bytes);

  const photoUrl = `/uploads/members/${filename}`;
  const updated = await prisma.member.update({
    where: { id: memberId },
    data: { photo: photoUrl },
  });

  return NextResponse.json({ photo: updated.photo });
}
