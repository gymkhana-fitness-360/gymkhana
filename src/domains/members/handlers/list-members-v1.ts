import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";

/** Public v1 members list — API key + gymId (AUDIT-013). */
export async function listPublicMembersV1(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.PUBLIC_API_KEY) {
    return ApiErrors.unauthorized("Invalid API key");
  }

  const gymId = request.nextUrl.searchParams.get("gymId");
  if (!gymId) return ApiErrors.validationError("gymId required");

  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "50", 10),
    200,
  );
  const status = request.nextUrl.searchParams.get("status");

  const members = await prisma.member.findMany({
    where: {
      gymId,
      deletedAt: null,
      ...(status ? { status: status as "ACTIVE" | "EXPIRED" } : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      status: true,
      joinDate: true,
      nextRenewalDate: true,
    },
    take: limit,
    orderBy: { joinDate: "desc" },
  });

  return NextResponse.json({ data: members, version: "v1" });
}
