import type { ListParams } from "../api-types";
import type { AttendanceMethodWire } from "../enums";

export interface RecordAttendanceRequest {
  memberId: string;
  method?: AttendanceMethodWire;
}

export interface QrAttendanceRequest {
  qrPayload: string;
}

export interface ListAttendanceRequest extends ListParams {
  date?: string;
  memberId?: string;
  startDate?: string;
  endDate?: string;
}
