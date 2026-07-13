import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { getActiveGoal } from "@/domains/goals/service";
import { listOpportunities } from "@/domains/revenue-opportunities/repository";
import { createSendReminderApproval } from "@/domains/approvals/service";
import { formatSimpleReminderMessage } from "@/lib/templates/reminder-simple";
import { formatDate } from "@/lib/utils";
import { toDateOnlyIST, daysFromTodayIST } from "@/lib/date-only";

/**
 * OS-9 (safe): queue reminder approvals for top chase rows — never auto-sends (G4).
 */
export const autonomousRecoveryQueue = inngest.createFunction(
  { id: "autonomous-recovery-queue", concurrency: { limit: 1 } },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    return step.run("queue-recovery-approvals", async () => {
      const gyms = await prisma.gym.findMany({ select: { id: true } });
      let queued = 0;

      for (const { id: gymId } of gyms) {
        const goal = await getActiveGoal(gymId);
        if (!goal || goal.status !== "ACTIVE") continue;

        const opportunities = await listOpportunities(gymId, {
          status: "OPEN",
          limit: 5,
        });

        for (const opp of opportunities) {
          if (!opp.memberPhone) continue;

          const pendingForMember = await prisma.approval.findMany({
            where: { gymId, status: "PENDING" },
            take: 20,
          });
          const alreadyQueued = pendingForMember.some((a) => {
            const p = a.payload as { memberId?: string };
            return p.memberId === opp.memberId;
          });
          if (alreadyQueued) continue;

          const member = await prisma.member.findFirst({
            where: { id: opp.memberId, gymId },
            include: {
              Membership: {
                where: { gymId },
                orderBy: { endDate: "desc" },
                take: 1,
                include: { Plan: { select: { name: true } } },
              },
            },
          });
          if (!member) continue;

          const expiry =
            member.Membership[0]?.endDate ?? member.nextRenewalDate;
          const daysOverdue =
            expiry != null
              ? Math.max(0, -daysFromTodayIST(toDateOnlyIST(expiry)))
              : undefined;

          const message = await formatSimpleReminderMessage({
            name: member.name,
            expiryDate: expiry ? formatDate(expiry) : "soon",
            daysLeft:
              expiry != null ? -daysFromTodayIST(toDateOnlyIST(expiry)) : undefined,
            daysOverdue: daysOverdue || undefined,
            planName: member.Membership[0]?.Plan?.name,
            phoneNumber: member.phone,
            gymId,
          });

          await createSendReminderApproval(gymId, "system:autonomous-recovery", {
            memberId: member.id,
            message,
            phoneNumber: member.phone,
          });
          queued += 1;
        }
      }

      return { queued };
    });
  },
);
