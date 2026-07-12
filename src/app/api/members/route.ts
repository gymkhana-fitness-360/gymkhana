import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cachedJson } from "@/lib/api-cache";
import { listMembersHandler } from "@/domains/members/handlers/list-members";
import { admitMemberHandler } from "@/domains/members/handlers/admit-member";
import { getMemberQueries } from "@/domains/members/adapters";
import { toApiListMember } from "@/domains/members/mappers/to-api-list-member";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";

const logger = createLogger("api-members");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    requirePermission(session, "canViewMembers");

    const response = await listMembersHandler(request, getMemberQueries());
    if (!response.ok) {
      return response;
    }
    const result = await response.json();
    if (!("pagination" in result)) {
      return cachedJson(result);
    }
    return cachedJson({
      members: result.members.map(toApiListMember),
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof PermissionError) {
      return ApiErrors.permissionDenied("canViewMembers");
    }
    logger.error("Failed to fetch members", error as Error);
    return ApiErrors.internal("Failed to fetch members");
  }
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    requirePermission(session, "canEditMembers");

    const response = await admitMemberHandler(request);
    const data = await response.json().catch(() => ({}));

    if (response.status === 201) {
      return successResponse(data, 201);
    }
    if (response.status === 409) {
      return successResponse(data, 409);
    }
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return successResponse(data, response.status);
  } catch (error) {
    if (error instanceof PermissionError) {
      return ApiErrors.permissionDenied("canEditMembers");
    }
    logger.error("Failed to create member", error as Error);
    return ApiErrors.internal("Failed to create member");
  }
}
