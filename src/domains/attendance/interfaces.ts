import type {
  AttendanceCheckInInputDTO,
  AttendanceDTO,
  AttendanceListResultDTO,
  AttendanceQrPayloadDTO,
  ListAttendanceParams,
} from "./types";

export interface IAttendanceService {
  checkIn(input: AttendanceCheckInInputDTO): Promise<AttendanceDTO>;
  checkOut(attendanceId: string, gymId: string): Promise<AttendanceDTO>;
  listAttendanceForMember(
    gymId: string,
    memberId: string,
    from: Date,
    to: Date
  ): Promise<AttendanceDTO[]>;
  listAttendance(params: ListAttendanceParams): Promise<AttendanceListResultDTO>;
}

export interface IAttendanceQrService {
  buildSignedQrPayload(
    gymId: string,
    memberId: string
  ): Promise<AttendanceQrPayloadDTO>;
  checkInWithSignedPayload(
    gymId: string,
    signedPayload: string
  ): Promise<AttendanceDTO>;
}
