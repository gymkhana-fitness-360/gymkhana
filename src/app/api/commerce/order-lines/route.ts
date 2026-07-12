import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { getApiGymId } from "@/lib/api/gym-context";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { createOrderLine } from "@/domains/commerce/order-lines";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();
  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const pendingOnly =
    request.nextUrl.searchParams.get("pending") === "1";

  const lines = await prisma.orderLine.findMany({
    where: {
      gymId,
      ...(pendingOnly
        ? { status: "PENDING", supplementGstInvoiceId: null }
        : {}),
    },
    include: {
      Product: true,
      Member: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return successResponse({ lines });
}

const createSchema = z.object({
  productId: z.string().min(1),
  memberId: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();
  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const line = await createOrderLine(gymId, parsed.data);
  if (!line) return ApiErrors.notFound("Product");
  return successResponse({ line }, 201);
}
