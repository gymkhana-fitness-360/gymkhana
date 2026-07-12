import type { AttendanceDTO } from "../types";

/** Legacy POST /api/attendance response shape. */
export function toApiAttendanceToggleResponse(attendance: AttendanceDTO) {
  const isCheckout = attendance.checkOutAt != null;
  const member = attendance.member ?? {
    id: attendance.memberId,
    name: "",
    phone: "",
  };
  return {
    message: isCheckout ? "Checked out successfully" : "Checked in successfully",
    attendance: {
      id: attendance.id,
      memberId: attendance.memberId,
      gymId: attendance.gymId,
      checkIn: attendance.checkInAt,
      checkOut: attendance.checkOutAt,
      method:
        attendance.source === "QR"
          ? "QR_CODE"
          : attendance.source === "MANUAL"
            ? "MANUAL"
            : "MANUAL",
      Member: member,
    },
    action: isCheckout ? ("checkout" as const) : ("checkin" as const),
  };
}
