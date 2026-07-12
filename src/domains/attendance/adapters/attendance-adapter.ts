import { prisma } from "@/lib/prisma";
import {
  AttendanceMethod,
  MemberStatus,
  type Attendance,
} from "@prisma/client";
import { todayIST, toDateOnlyIST } from "@/lib/date-only";
import { signQRData, verifyQRData } from "@/lib/qr-signing";
import type {
  IAttendanceQrService,
  IAttendanceService,
} from "../interfaces";
import type {
  AttendanceCheckInInputDTO,
  AttendanceDTO,
  AttendanceListResultDTO,
  AttendanceListRowDTO,
  AttendanceQrPayloadDTO,
  ListAttendanceParams,
} from "../types";

type AttendanceQrPayload = {
  memberId: string;
  timestamp: string;
  type: string;
};

function isAttendanceQrPayload(data: unknown): data is AttendanceQrPayload {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.memberId === "string" &&
    typeof o.timestamp === "string" &&
    o.type === "attendance"
  );
}

function methodToSource(method: AttendanceMethod): AttendanceDTO["source"] {
  if (method === "QR_CODE") return "QR";
  return "MANUAL";
}

type AttendanceWithMember = Attendance & {
  Member?: { id: string; name: string; phone: string };
};

function toAttendanceDTO(a: AttendanceWithMember): AttendanceDTO {
  return {
    id: a.id,
    gymId: a.gymId,
    memberId: a.memberId,
    date: toDateOnlyIST(a.checkIn),
    checkInAt: a.checkIn,
    checkOutAt: a.checkOut,
    source: methodToSource(a.method),
    member: a.Member
      ? { id: a.Member.id, name: a.Member.name, phone: a.Member.phone }
      : undefined,
  };
}

/**
 * Prisma-backed attendance + QR signing (aligned with legacy API routes).
 */
export class AttendanceAdapter implements IAttendanceService, IAttendanceQrService {
  async checkIn(input: AttendanceCheckInInputDTO): Promise<AttendanceDTO> {
    const { gymId, memberId, at, method = "MANUAL" } = input;

    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId },
      select: {
        id: true,
        gymId: true,
        status: true,
      },
    });

    if (!member) {
      throw new Error("Member not found");
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new Error(
        `Member status is ${member.status}. Only ACTIVE members can check in.`
      );
    }

    const today = todayIST();

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        memberId,
        gymId,
        checkIn: { gte: today },
        checkOut: null,
      },
    });

    const memberSelect = {
      Member: { select: { id: true, name: true, phone: true } },
    } as const;

    if (existingAttendance) {
      const updated = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: { checkOut: new Date() },
        include: memberSelect,
      });
      return toAttendanceDTO(updated);
    }

    const created = await prisma.attendance.create({
      data: {
        memberId,
        gymId: member.gymId,
        method,
        ...(at ? { checkIn: at } : {}),
      },
      include: memberSelect,
    });
    return toAttendanceDTO(created);
  }

  async checkOut(attendanceId: string, gymId: string): Promise<AttendanceDTO> {
    const row = await prisma.attendance.findFirst({
      where: { id: attendanceId, gymId },
    });
    if (!row) {
      throw new Error("Attendance not found");
    }
    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: { checkOut: new Date() },
    });
    return toAttendanceDTO(updated);
  }

  async listAttendance(params: ListAttendanceParams): Promise<AttendanceListResultDTO> {
    const { gymId, memberId, date, startDate, endDate } = params;
    const where: {
      gymId: string;
      memberId?: string;
      checkIn?: { gte?: Date; lt?: Date; lte?: Date };
    } = { gymId };

    if (memberId) {
      where.memberId = memberId;
    }

    if (date) {
      const targetDate = new Date(date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      where.checkIn = { gte: targetDate, lt: nextDate };
    } else if (startDate || endDate) {
      where.checkIn = {};
      if (startDate) where.checkIn.gte = new Date(startDate);
      if (endDate) where.checkIn.lte = new Date(endDate);
    }

    const rows = await prisma.attendance.findMany({
      where,
      include: {
        Member: {
          select: {
            id: true,
            name: true,
            phone: true,
            photo: true,
          },
        },
      },
      orderBy: { checkIn: "desc" },
    });

    const attendance: AttendanceListRowDTO[] = rows.map((a) => ({
      id: a.id,
      memberId: a.memberId,
      gymId: a.gymId,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      method: a.method,
      Member: a.Member,
    }));

    return {
      attendance,
      stats: {
        totalRecords: attendance.length,
        checkedIn: attendance.filter((a) => !a.checkOut).length,
        checkedOut: attendance.filter((a) => a.checkOut).length,
        byMethod: {
          manual: attendance.filter((a) => a.method === "MANUAL").length,
          qrCode: attendance.filter((a) => a.method === "QR_CODE").length,
          rfid: attendance.filter((a) => a.method === "RFID").length,
          biometric: attendance.filter((a) => a.method === "BIOMETRIC").length,
          geofence: attendance.filter((a) => a.method === "GEOFENCE").length,
        },
      },
    };
  }

  async listAttendanceForMember(
    gymId: string,
    memberId: string,
    from: Date,
    to: Date
  ): Promise<AttendanceDTO[]> {
    const rows = await prisma.attendance.findMany({
      where: {
        gymId,
        memberId,
        checkIn: { gte: from, lte: to },
      },
      orderBy: { checkIn: "desc" },
    });
    return rows.map((a) => toAttendanceDTO(a));
  }

  async buildSignedQrPayload(
    gymId: string,
    memberId: string
  ): Promise<AttendanceQrPayloadDTO> {
    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
      },
    });
    if (!member) {
      throw new Error("Member not found");
    }
    const qrPayload = {
      memberId: member.id,
      timestamp: new Date().toISOString(),
      type: "attendance" as const,
    };
    return {
      qrData: signQRData(qrPayload),
      memberId: member.id,
      Member: {
        name: member.name,
        phone: member.phone,
        status: member.status,
      },
    };
  }

  async checkInWithSignedPayload(
    gymId: string,
    signedPayload: string
  ): Promise<AttendanceDTO> {
    const verified = verifyQRData(signedPayload);
    if (!verified.valid || !isAttendanceQrPayload(verified.data)) {
      throw new Error("Invalid or tampered QR payload");
    }

    const { memberId, timestamp } = verified.data;
    const qrTimestamp = new Date(timestamp);
    const diffMinutes =
      (Date.now() - qrTimestamp.getTime()) / (1000 * 60);
    if (diffMinutes > 5) {
      throw new Error("QR code expired");
    }

    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId },
      select: {
        id: true,
        gymId: true,
        name: true,
        phone: true,
        status: true,
      },
    });

    if (!member) {
      throw new Error("Member not found");
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new Error(
        `Member status is ${member.status}. Only ACTIVE members can check in.`
      );
    }

    const today = todayIST();
    const memberSelect = {
      Member: { select: { id: true, name: true, phone: true } },
    } as const;

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        memberId,
        gymId,
        checkIn: { gte: today },
        checkOut: null,
      },
    });

    if (existingAttendance) {
      const updated = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: { checkOut: new Date() },
        include: memberSelect,
      });
      return toAttendanceDTO(updated);
    }

    const created = await prisma.attendance.create({
      data: {
        memberId,
        gymId: member.gymId,
        method: "QR_CODE",
        qrCodeData: signedPayload,
      },
      include: memberSelect,
    });
    return toAttendanceDTO(created);
  }
}
