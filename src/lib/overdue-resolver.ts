/**
 * Overdue Resolver
 * Automatically resolves overdue tracking when payment is received
 */

import { prisma } from "./prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("lib-overdue-resolver.ts");

export async function resolveOverdueOnPayment(
  memberId: string,
  paymentDate: Date
) {
  try {
    // Get month string from payment date
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const month = `${monthNames[paymentDate.getMonth()]} ${paymentDate.getFullYear()}`;

    // Find and resolve overdue record for this member and month
    const overdueRecord = await prisma.overdueTracking.findUnique({
      where: {
        memberId_month: {
          memberId,
          month,
        },
      },
    });

    if (overdueRecord && !overdueRecord.resolvedAt) {
      await prisma.overdueTracking.update({
        where: { id: overdueRecord.id },
        data: {
          resolvedAt: new Date(),
          notes: `${overdueRecord.notes || ""}\nResolved: Payment received on ${paymentDate.toLocaleDateString()}`,
        },
      });

      logger.info(
        `✅ Resolved overdue for member ${memberId} for ${month}`
      );
      return true;
    }

    return false;
  } catch (error) {
    logger.error("Error resolving overdue:", error as Error);
    return false;
  }
}
