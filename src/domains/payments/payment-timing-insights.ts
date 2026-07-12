import { prisma } from "@/lib/prisma";

const IST_TZ = "Asia/Kolkata";

function dayOfMonthIST(d: Date): number {
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TZ,
    day: "numeric",
  }).format(d);
  return parseInt(day, 10);
}

export async function getPaymentTimingInsights(gymId: string, memberId?: string) {
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const payments = await prisma.payment.findMany({
    where: {
      gymId,
      status: "COMPLETED",
      receivedAt: { gte: since },
      ...(memberId ? { memberId } : {}),
    },
    select: {
      memberId: true,
      amount: true,
      receivedAt: true,
      method: true,
    },
  });

  const byDom = new Map<number, { count: number; total: number }>();
  const byMethod = new Map<string, number>();

  for (const p of payments) {
    const dom = dayOfMonthIST(p.receivedAt);
    const bucket = byDom.get(dom) ?? { count: 0, total: 0 };
    bucket.count += 1;
    bucket.total += Number(p.amount);
    byDom.set(dom, bucket);

    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + 1);
  }

  let lowestDom = 1;
  let lowestCount = Infinity;
  for (const [dom, stats] of byDom.entries()) {
    if (stats.count < lowestCount) {
      lowestCount = stats.count;
      lowestDom = dom;
    }
  }

  const sorted = [...byDom.entries()].sort((a, b) => b[1].count - a[1].count);
  const peakDom = sorted[0]?.[0] ?? null;

  const preferredMethod =
    [...byMethod.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    sampleSize: payments.length,
    peakPaymentDayOfMonth: peakDom,
    lowestPaymentDayOfMonth: byDom.size > 0 ? lowestDom : null,
    distributionByDayOfMonth: sorted.map(([day, s]) => ({
      day,
      count: s.count,
      totalInr: Math.round(s.total),
    })),
    preferredMethod,
    suggestDiscountWindow:
      lowestDom != null
        ? `Days ${Math.max(1, lowestDom - 2)}–${Math.min(28, lowestDom + 2)} historically see fewer payments`
        : null,
    personalizedPaymentOptions: preferredMethod
      ? [`${preferredMethod}`, "UPI", "CASH"].filter(
          (v, i, a) => a.indexOf(v) === i,
        )
      : ["UPI", "CASH"],
  };
}
