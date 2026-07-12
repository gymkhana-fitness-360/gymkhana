import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import {
  getLatestUndoableAction,
  restorePaymentDeleteUndo,
} from "@/lib/services/undo-stack.service";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-undo");

const undoBodySchema = z.object({
  confirm: z.literal(true),
  auditLogId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) {
    return ApiErrors.unauthorized();
  }

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof Response) return gymId;

  const item = await getLatestUndoableAction(gymId);
  return successResponse({ available: !!item, item });
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) {
    return ApiErrors.unauthorized();
  }

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof Response) return gymId;

  const parsed = undoBodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return ApiErrors.validationError('Set "confirm": true to restore deleted data.');
  }
  const body = parsed.data;

  let auditLogId = body.auditLogId;
  if (!auditLogId) {
    const latest = await getLatestUndoableAction(gymId);
    if (!latest) {
      return ApiErrors.validationError(
        "Nothing to undo — no recent delete with restore data (30 min window).",
      );
    }
    auditLogId = latest.auditLogId;
  }

  try {
    const result = await restorePaymentDeleteUndo(auditLogId, gymId, session.user.id);
    logger.info(`Undo restore by ${session.user.email} for member ${result.memberId}`);
    return successResponse({
      restored: result,
      memberId: result.memberId,
      message: `Restored ${result.restoredPayments} payment(s) and ${result.restoredMemberships} membership period(s).`,
    });
  } catch (error) {
    logger.error("undo restore failed", error as Error);
    return ApiErrors.validationError(error instanceof Error ? error.message : "Undo failed");
  }
}

export const dynamic = "force-dynamic";
