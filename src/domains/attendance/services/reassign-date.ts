import type { PrismaClient } from "@prisma/client";
import { toDateOnlyIST } from "@/lib/date-only";
import { isoDateOnlyString } from "@/lib/gym-operational-days";
import { logAction } from "@/lib/audit-logger";

export type AttendanceReassignRow = {
  attendanceId: string;
  memberName?: string;
  ok: boolean;
  message?: string;
  sourceDateYmd?: string;
};

export async function reassignAttendanceToDate(
  prisma: PrismaClient,
  input: {
    gymId: string;
    attendanceIds: string[];
    targetDateYmd: string;
    adminUserId: string;
  },
): Promise<{
  succeeded: number;
  failed: number;
  results: AttendanceReassignRow[];
  sourceDates: string[];
}> {
  const target = toDateOnlyIST(input.targetDateYmd);
  const results: AttendanceReassignRow[] = [];
  const sourceDates = new Set<string>();

  for (const attendanceId of input.attendanceIds) {
    const row = await prisma.attendance.findFirst({
      where: { id: attendanceId, gymId: input.gymId },
      include: { Member: { select: { name: true } } },
    });
    if (!row) {
      results.push({ attendanceId, ok: false, message: "Not found" });
      continue;
    }

    const sourceYmd = isoDateOnlyString(row.checkIn);
    sourceDates.add(sourceYmd);

    const checkInTime = row.checkIn;
    const hours = checkInTime.getUTCHours();
    const minutes = checkInTime.getUTCMinutes();
    const seconds = checkInTime.getUTCSeconds();
    const newCheckIn = new Date(target);
    newCheckIn.setUTCHours(hours, minutes, seconds, 0);

    let newCheckOut: Date | null = row.checkOut;
    if (row.checkOut) {
      const durationMs = row.checkOut.getTime() - row.checkIn.getTime();
      newCheckOut = new Date(newCheckIn.getTime() + durationMs);
    }

    await prisma.attendance.update({
      where: { id: attendanceId },
      data: { checkIn: newCheckIn, checkOut: newCheckOut },
    });

    await logAction(input.adminUserId, "member_updated", "Attendance", attendanceId, {
      gymId: input.gymId,
      action: "reassign_date",
      from: sourceYmd,
      to: input.targetDateYmd,
      memberName: row.Member.name,
    });

    results.push({
      attendanceId,
      memberName: row.Member.name,
      ok: true,
      sourceDateYmd: sourceYmd,
    });
  }

  return {
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
    sourceDates: [...sourceDates],
  };
}
