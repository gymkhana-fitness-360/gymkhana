import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import {
  LIFECYCLE_TEMPLATE_KEYS,
  listLifecycleTemplates,
  renderLifecycleTemplate,
  resetLifecycleTemplate,
  saveLifecycleTemplate,
  SAMPLE_LIFECYCLE_PREVIEW_DATA,
} from "@/domains/communications/lifecycle-templates";

const logger = createLogger("api-whatsapp-lifecycle-templates");

const saveSchema = z.object({
  key: z.enum(LIFECYCLE_TEMPLATE_KEYS),
  body: z.string().min(1).max(4000),
});

const saveManySchema = z.object({
  templates: z.array(saveSchema).min(1).max(9),
});

const previewSchema = z.object({
  key: z.enum(LIFECYCLE_TEMPLATE_KEYS).optional(),
  body: z.string().min(1).max(4000),
  sample: z
    .object({
      name: z.string().optional(),
      plan: z.string().optional(),
      expiryDate: z.string().optional(),
      daysLeft: z.number().optional(),
      checkInDate: z.string().optional(),
    })
    .optional(),
});

const resetSchema = z.object({
  key: z.enum(LIFECYCLE_TEMPLATE_KEYS).optional(),
});

async function requireAdminGym(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return { error: ApiErrors.unauthorized() as NextResponse };
  if (session.user.role !== "ADMIN") {
    return { error: ApiErrors.forbidden("Admin access required") as NextResponse };
  }

  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request),
  );
  if (!gymId) {
    return {
      error: ApiErrors.validationError("No gym selected or account has no locations.") as NextResponse,
    };
  }

  return { gymId };
}

/** GET /api/settings/whatsapp-lifecycle-templates */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const ctx = await requireAdminGym(request);
    if ("error" in ctx && ctx.error) return ctx.error;

    const templates = await listLifecycleTemplates(ctx.gymId!);
    return NextResponse.json({ templates });
  } catch (error) {
    logger.error("Lifecycle templates GET error:", error as Error);
    return ApiErrors.internal("Failed to load WhatsApp lifecycle templates");
  }
}

/** PUT /api/settings/whatsapp-lifecycle-templates */
export async function PUT(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const ctx = await requireAdminGym(request);
    if ("error" in ctx && ctx.error) return ctx.error;

    const parsed = await parseJsonBody(request, z.union([saveSchema, saveManySchema]));
    if (!parsed.ok) return parsed.response;

    const updates =
      "templates" in parsed.data ? parsed.data.templates : [parsed.data];

    for (const { key, body } of updates) {
      await saveLifecycleTemplate(ctx.gymId!, key, body);
    }

    const templates = await listLifecycleTemplates(ctx.gymId!);
    return NextResponse.json({ templates });
  } catch (error) {
    logger.error("Lifecycle templates PUT error:", error as Error);
    return ApiErrors.internal("Failed to save WhatsApp lifecycle templates");
  }
}

/** POST /api/settings/whatsapp-lifecycle-templates — preview or reset */
export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const ctx = await requireAdminGym(request);
    if ("error" in ctx && ctx.error) return ctx.error;

    const action = request.nextUrl.searchParams.get("action");

    if (action === "reset") {
      const parsed = await parseJsonBody(request, resetSchema);
      if (!parsed.ok) return parsed.response;
      await resetLifecycleTemplate(ctx.gymId!, parsed.data.key);
      const templates = await listLifecycleTemplates(ctx.gymId!);
      return NextResponse.json({ templates });
    }

    const parsed = await parseJsonBody(request, previewSchema);
    if (!parsed.ok) return parsed.response;

    const sample = {
      ...SAMPLE_LIFECYCLE_PREVIEW_DATA,
      ...parsed.data.sample,
      n: Math.abs(parsed.data.sample?.daysLeft ?? SAMPLE_LIFECYCLE_PREVIEW_DATA.daysLeft),
      daysWord:
        Math.abs(parsed.data.sample?.daysLeft ?? SAMPLE_LIFECYCLE_PREVIEW_DATA.daysLeft) === 1
          ? "day"
          : "days",
    };

    const preview = renderLifecycleTemplate(parsed.data.body, sample);
    return NextResponse.json({ preview, sample });
  } catch (error) {
    logger.error("Lifecycle templates POST error:", error as Error);
    return ApiErrors.internal("Failed to process WhatsApp lifecycle template request");
  }
}
