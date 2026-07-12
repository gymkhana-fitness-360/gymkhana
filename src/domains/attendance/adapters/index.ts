import type { IAttendanceQrService, IAttendanceService } from "../interfaces";
import { AttendanceAdapter } from "./attendance-adapter";

let attendanceAdapter: AttendanceAdapter | null = null;

export function getAttendanceService(): IAttendanceService {
  if (!attendanceAdapter) {
    attendanceAdapter = new AttendanceAdapter();
  }
  return attendanceAdapter;
}

export function getAttendanceQrService(): IAttendanceQrService {
  if (!attendanceAdapter) {
    attendanceAdapter = new AttendanceAdapter();
  }
  return attendanceAdapter;
}

export { AttendanceAdapter } from "./attendance-adapter";
