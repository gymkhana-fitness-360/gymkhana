import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { getApiGymId } from "@/lib/api/gym-context";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import {
  deleteWhatsAppTemplate,
  updateWhatsAppTemplate,
} from "@/domains/whatsapp-templates/service";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  body: z.string().min(1).max(4000).optional(),
  category: z.enum(["RENEWAL", "TRIAL", "LEAD", "GENERAL"]).optional(),
  metaTemplateName: z.string().nullable().optional(),
  isApproved: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();
  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const { id } = await params;
  const parsed = await parseJsonBody(request, updateSchema);
  if (!parsed.ok) return parsed.response;

  const template = await updateWhatsAppTemplate(gymId, id, parsed.data);
  if (!template) return ApiErrors.notFound("Template");
  return successResponse({ template });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();
  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const { id } = await params;
  const ok = await deleteWhatsAppTemplate(gymId, id);
  if (!ok) return ApiErrors.notFound("Template");
  return successResponse({ success: true });
}
