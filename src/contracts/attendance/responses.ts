import type { AttendanceMethodWire } from "../enums";

export interface AttendanceMemberSnippetWire {
  id?: string;
  name: string;
  phone?: string;
}

/** Aligns with Prisma `Attendance` JSON shape (ISO strings over the wire). */
export interface AttendanceRecordWire {
  id: string;
  gymId: string;
  memberId: string;
  checkIn: string;
  checkOut?: string | null;
  method: AttendanceMethodWire;
  qrCodeData?: string | null;
  Member?: AttendanceMemberSnippetWire;
}

export interface AttendanceListStatsWire {
  totalRecords: number;
  checkedIn: number;
  checkedOut: number;
}

export interface AttendanceListResponse {
  attendance: AttendanceRecordWire[];
  stats: AttendanceListStatsWire;
}

export type AttendanceToggleAction = "checkin" | "checkout";

export interface RecordAttendanceResponse {
  message: string;
  action: AttendanceToggleAction;
  attendance: AttendanceRecordWire;
}

export interface QrCheckInResponse {
  success: boolean;
  member: { id: string; name: string; phone?: string };
  action: AttendanceToggleAction;
}
