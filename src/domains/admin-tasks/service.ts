import { AdminTaskPriority, AdminTaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { todayIST, addDaysIST } from "@/lib/date-only";

export const ADMIN_TASK_TYPES = {
  renewalNeedsResolution: "renewal_needs_resolution",
  expiredAttendanceCheckIn: "expired_attendance_checkin",
} as const;

export type AdminTaskRow = {
  id: string;
  type: string;
  priority: AdminTaskPriority;
  status: AdminTaskStatus;
  title: string;
  description: string;
  metadata: unknown;
  createdAt: Date;
  resolvedAt: Date | null;
};

export async function listAdminTasks(gymId: string, status?: AdminTaskStatus) {
  return prisma.adminTask.findMany({
    where: { gymId, ...(status ? { status } : {}) },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
}

export async function resolveAdminTask(gymId: string, taskId: string, userId: string, action: "resolve" | "dismiss") {
  const task = await prisma.adminTask.findFirst({ where: { id: taskId, gymId } });
  if (!task) throw new Error("Task not found");
  return prisma.adminTask.update({
    where: { id: taskId },
    data: {
      status: action === "resolve" ? AdminTaskStatus.RESOLVED : AdminTaskStatus.DISMISSED,
      resolvedAt: new Date(),
      resolvedBy: userId,
    },
  });
}

export async function countPendingAdminTasks(gymId: string) {
  return prisma.adminTask.count({ where: { gymId, status: AdminTaskStatus.PENDING } });
}

/** Sync renewal-needs-resolution tasks from late payments after membership end. */
export async function syncRenewalAdminTasks(gymId: string) {
  const today = todayIST();
  const memberships = await prisma.membership.findMany({
    where: { gymId, endDate: { lt: today } },
    include: { Member: { select: { id: true, name: true } }, Plan: { select: { name: true } } },
    take: 500,
  });

  let upserted = 0;
  for (const m of memberships) {
    const latePayment = await prisma.payment.findFirst({
      where: {
        gymId,
        memberId: m.memberId,
        status: "COMPLETED",
        OR: [{ paymentDate: { gt: m.endDate } }, { receivedAt: { gt: m.endDate } }],
      },
    });
    if (!latePayment) continue;

    const dedupeKey = `${ADMIN_TASK_TYPES.renewalNeedsResolution}:${m.id}`;
    const existing = await prisma.adminTask.findFirst({
      where: {
        gymId,
        type: ADMIN_TASK_TYPES.renewalNeedsResolution,
        status: AdminTaskStatus.PENDING,
        metadata: { path: ["dedupeKey"], equals: dedupeKey },
      },
    });

    const title = `Late payment — ${m.Member.name}`;
    const description = `Payment recorded after membership ended (${m.Plan.name}). Review dates or record renewal.`;
    const metadata = { dedupeKey, memberId: m.memberId, membershipId: m.id, memberName: m.Member.name };

    if (existing) {
      await prisma.adminTask.update({
        where: { id: existing.id },
        data: { title, description, metadata },
      });
    } else {
      await prisma.adminTask.create({
        data: {
          gymId,
          type: ADMIN_TASK_TYPES.renewalNeedsResolution,
          priority: AdminTaskPriority.HIGH,
          title,
          description,
          metadata,
        },
      });
    }
    upserted++;
  }
  return { upserted };
}

export async function syncAllAdminTasks(gymId: string) {
  const renewal = await syncRenewalAdminTasks(gymId);
  return { renewal };
}
