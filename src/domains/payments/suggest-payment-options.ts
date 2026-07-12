import { getPaymentTimingInsights } from "./payment-timing-insights";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import { prisma } from "@/lib/prisma";

/** E-034: personalised payment options from member history. */
export async function suggestPaymentOptions(gymId: string, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    select: { id: true, name: true, phone: true },
  });
  if (!member) return null;

  const timing = await getPaymentTimingInsights(gymId, memberId);
  const membership = await prisma.membership.findFirst({
    where: { gymId, memberId },
    orderBy: { endDate: "desc" },
    select: { amount: true },
  });

  const amount = Number(membership?.amount ?? 0);
  const options: {
    method: string;
    label: string;
    recommended: boolean;
  }[] = [];

  if (timing.preferredMethod) {
    options.push({
      method: timing.preferredMethod,
      label: `Pay via ${timing.preferredMethod} (usual method)`,
      recommended: true,
    });
  }

  options.push({
    method: "UPI",
    label: "UPI payment link",
    recommended: !timing.preferredMethod,
  });

  if (isRazorpayConfigured()) {
    options.push({
      method: "RAZORPAY_LINK",
      label: "Online payment link (Razorpay)",
      recommended: true,
    });
  }

  return {
    memberId: member.id,
    memberName: member.name,
    suggestedAmountInr: amount,
    bestDayOfMonth: timing.lowestPaymentDayOfMonth,
    peakDayOfMonth: timing.peakPaymentDayOfMonth,
    options,
    note: timing.suggestDiscountWindow ?? undefined,
  };
}
