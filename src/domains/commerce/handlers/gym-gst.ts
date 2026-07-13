import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { getApiGymId } from "@/lib/api/gym-context";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { validateGstin } from "@/lib/commerce/gst";

export async function getGymGstHandler(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();
  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const gym = await prisma.gym.findFirst({
    where: { id: gymId },
    select: {
      gstin: true,
      invoiceLegalName: true,
      invoiceStateCode: true,
      name: true,
      address: true,
    },
  });
  return successResponse({ gym });
}

const patchSchema = z.object({
  gstin: z.string().min(15).max(15),
  invoiceLegalName: z.string().min(1).max(200),
  invoiceStateCode: z.string().min(1).max(2).optional(),
});

export async function patchGymGstHandler(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") {
    return ApiErrors.forbidden("Admin access required");
  }

  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const parsed = await parseJsonBody(request, patchSchema);
  if (!parsed.ok) return parsed.response;

  if (!validateGstin(parsed.data.gstin)) {
    return ApiErrors.validationError("Invalid GSTIN format");
  }

  const gym = await prisma.gym.update({
    where: { id: gymId },
    data: {
      gstin: parsed.data.gstin.toUpperCase(),
      invoiceLegalName: parsed.data.invoiceLegalName,
      invoiceStateCode: parsed.data.invoiceStateCode,
    },
    select: {
      gstin: true,
      invoiceLegalName: true,
      invoiceStateCode: true,
    },
  });

  return successResponse({ gym });
}
