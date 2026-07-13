import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { isMarketplaceAppEnabled } from "@/lib/marketplace/install";
import { createRazorpayPaymentLink } from "@/lib/payments/razorpay";
import { getApiGymId } from "@/lib/api/gym-context";

const bodySchema = z.object({
  memberId: z.string().optional(),
  amount: z.number().positive(),
  description: z.string().min(1).max(200),
});

export async function createRazorpayLinkHandler(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();

  try {
    requirePermission(session, "canEditPayments");
  } catch (error) {
    if (error instanceof PermissionError) return ApiErrors.forbidden();
    throw error;
  }

  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const enabled = await isMarketplaceAppEnabled(gymId, "razorpay-payments");
  if (!enabled) {
    return ApiErrors.forbidden("Install Razorpay Payments from the Marketplace first");
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return ApiErrors.validationError("Invalid body", parsed.error.issues);
  }

  let member: { id: string; name: string; phone: string } | null = null;
  if (parsed.data.memberId) {
    member = await prisma.member.findFirst({
      where: { id: parsed.data.memberId, gymId },
      select: { id: true, name: true, phone: true },
    });
    if (!member) return ApiErrors.notFound("Member not found");
  }

  const checkout = await prisma.paymentCheckoutLink.create({
    data: {
      gymId,
      memberId: member?.id,
      amount: parsed.data.amount,
    },
  });

  const link = await createRazorpayPaymentLink({
    amountInr: parsed.data.amount,
    description: parsed.data.description,
    customerName: member?.name,
    customerPhone: member?.phone,
    referenceId: checkout.id,
  });

  const updated = await prisma.paymentCheckoutLink.update({
    where: { id: checkout.id },
    data: {
      externalId: link.id,
      checkoutUrl: link.shortUrl,
      status: link.status,
    },
  });

  return successResponse({ checkout: updated }, 201);
}
