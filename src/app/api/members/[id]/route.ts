import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getMemberHandler } from "@/domains/members/handlers/get-member";
import { updateMemberHandler } from "@/domains/members/handlers/update-member";
import { deleteMemberHandler } from "@/domains/members/handlers/delete-member";
import { getMemberQueries, getMemberService } from "@/domains/members/adapters";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";

const logger = createLogger("api-members");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    try {
      requirePermission(session, "canViewMembers");
    } catch (error) {
      if (error instanceof PermissionError) {
        return ApiErrors.forbidden("Permission denied: cannot view members");
      }
      throw error;
    }

    const { id } = await params;
    const response = await getMemberHandler(request, { id }, getMemberQueries());
    if (!response.ok) return response;
    const member = await response.json();
    return successResponse(member);
  } catch (error) {
    logger.error("Error fetching Member:", error as Error);
    return ApiErrors.internal("Failed to fetch member");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    requirePermission(session, "canEditMembers");

    const { id } = await params;
    return updateMemberHandler(request, { id }, getMemberService());
  } catch (error) {
    if (error instanceof PermissionError) {
      return ApiErrors.permissionDenied("canEditMembers");
    }
    logger.error("Error updating Member:", error as Error);
    return ApiErrors.internal("Failed to update member");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    requirePermission(session, "canEditMembers");

    const { id } = await params;
    return deleteMemberHandler(request, { id }, getMemberService());
  } catch (error) {
    if (error instanceof PermissionError) {
      return ApiErrors.permissionDenied("canEditMembers");
    }
    logger.error("Error deleting Member:", error as Error);
    return ApiErrors.internal("Failed to delete member");
  }
}
