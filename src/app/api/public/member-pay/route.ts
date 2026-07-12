import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { isMarketplaceAppEnabled } from "@/lib/marketplace/install";
import { createRazorpayPaymentLink } from "@/lib/payments/razorpay";

const bodySchema = z.object({
  gymId: z.string().uuid(),
  memberId: z.string().min(1),
});

/** GTM-M-001: public member payment link (no staff session). */
export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const member = await prisma.member.findFirst({
    where: {
      id: parsed.data.memberId,
      gymId: parsed.data.gymId,
      status: "ACTIVE",
    },
    include: {
      Membership: {
        where: { gymId: parsed.data.gymId },
        orderBy: { endDate: "desc" },
        take: 1,
      },
    },
  });

  if (!member) return ApiErrors.notFound("Member");

  const enabled = await isMarketplaceAppEnabled(
    parsed.data.gymId,
    "razorpay-payments",
  );
  if (!enabled) {
    return ApiErrors.forbidden(
      "Online payments are not enabled for this gym",
    );
  }

  const amount = Number(member.Membership[0]?.amount ?? 0);
  if (!amount || amount <= 0) {
    return ApiErrors.badRequest("No membership amount on file");
  }

  const checkout = await prisma.paymentCheckoutLink.create({
    data: {
      gymId: parsed.data.gymId,
      memberId: member.id,
      amount,
    },
  });

  const link = await createRazorpayPaymentLink({
    amountInr: amount,
    description: `Membership — ${member.name}`,
    customerName: member.name,
    customerPhone: member.phone,
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

  return successResponse({ checkoutUrl: updated.checkoutUrl }, 201);
}
