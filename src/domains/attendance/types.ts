export type AttendanceDirection = "IN" | "OUT";

export interface AttendanceMemberSummaryDTO {
  id: string;
  name: string;
  phone: string;
}

export interface AttendanceDTO {
  id: string;
  gymId: string;
  memberId: string;
  date: Date;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  source: "MANUAL" | "QR" | "KIOSK";
  member?: AttendanceMemberSummaryDTO;
}

export interface AttendanceCheckInInputDTO {
  gymId: string;
  memberId: string;
  at?: Date;
  method?: "MANUAL" | "QR_CODE" | "RFID" | "BIOMETRIC" | "GEOFENCE";
}

export interface AttendanceQrMemberDTO {
  name: string;
  phone: string;
  status: string;
}

export interface AttendanceQrPayloadDTO {
  qrData: string;
  memberId: string;
  Member?: AttendanceQrMemberDTO;
}

export interface ListAttendanceParams {
  gymId: string;
  memberId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

export interface AttendanceListMemberDTO {
  id: string;
  name: string;
  phone: string;
  photo: string | null;
}

export interface AttendanceListRowDTO {
  id: string;
  memberId: string;
  gymId: string;
  checkIn: Date;
  checkOut: Date | null;
  method: string;
  Member: AttendanceListMemberDTO;
}

export interface AttendanceListStatsDTO {
  totalRecords: number;
  checkedIn: number;
  checkedOut: number;
  byMethod: {
    manual: number;
    qrCode: number;
    rfid: number;
    biometric: number;
    geofence: number;
  };
}

export interface AttendanceListResultDTO {
  attendance: AttendanceListRowDTO[];
  stats: AttendanceListStatsDTO;
}
