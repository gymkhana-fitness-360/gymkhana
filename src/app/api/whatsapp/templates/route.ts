import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { getApiGymId } from "@/lib/api/gym-context";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import {
  createWhatsAppTemplate,
  listWhatsAppTemplates,
} from "@/domains/whatsapp-templates/service";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();
  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const templates = await listWhatsAppTemplates(gymId);
  return successResponse({ templates });
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  body: z.string().min(1).max(4000),
  category: z.enum(["RENEWAL", "TRIAL", "LEAD", "GENERAL"]).optional(),
  metaTemplateName: z.string().optional(),
  isApproved: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();
  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const template = await createWhatsAppTemplate(gymId, parsed.data);
  return successResponse({ template }, 201);
}
