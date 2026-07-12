import { prisma } from "@/lib/prisma";
import { reassignAttendanceToDate } from "@/domains/attendance/services/reassign-date";

export type ReassignAttendanceDateInput = {
  gymId: string;
  attendanceIds: string[];
  targetDateYmd: string;
  adminUserId: string;
};

export async function reassignAttendanceDate(input: ReassignAttendanceDateInput) {
  return reassignAttendanceToDate(prisma, {
    gymId: input.gymId,
    attendanceIds: input.attendanceIds,
    targetDateYmd: input.targetDateYmd,
    adminUserId: input.adminUserId,
  });
}
