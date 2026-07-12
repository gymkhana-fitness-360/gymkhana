import type { AttendanceDTO } from "../types";

/** Legacy POST /api/attendance/qr response shape. */
export function toApiQrCheckInResponse(attendance: AttendanceDTO) {
  const isCheckout = attendance.checkOutAt != null;
  const member = attendance.member;
  return {
    message: isCheckout ? "Checked out successfully" : "Checked in successfully",
    attendance: {
      id: attendance.id,
      memberId: attendance.memberId,
      gymId: attendance.gymId,
      checkIn: attendance.checkInAt,
      checkOut: attendance.checkOutAt,
      method: "QR_CODE",
    },
    member: member
      ? { name: member.name, phone: member.phone }
      : { name: "", phone: "" },
    action: isCheckout ? ("checkout" as const) : ("checkin" as const),
  };
}
