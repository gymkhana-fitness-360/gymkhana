import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IAttendanceService } from "../interfaces";
import type { AttendanceCheckInInputDTO, AttendanceDTO } from "../types";
import { ApiErrors } from "@/lib/api-handler";

const checkInBodySchema = z.object({
  memberId: z.string().min(1),
  at: z.coerce.date().optional(),
  method: z
    .enum(["MANUAL", "QR_CODE", "RFID", "BIOMETRIC", "GEOFENCE"])
    .optional(),
});

export async function recordAttendanceHandler(
  req: NextRequest,
  attendanceService: IAttendanceService
): Promise<NextResponse<AttendanceDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const json = await req.json().catch(() => null);
    const parsed = checkInBodySchema.safeParse(json);
    if (!parsed.success) {
      return ApiErrors.validationError("Validation failed", parsed.error.issues);
    }
    const input: AttendanceCheckInInputDTO = {
      gymId,
      memberId: parsed.data.memberId,
      at: parsed.data.at,
      method: parsed.data.method,
    };
    const attendance = await attendanceService.checkIn(input);
    return NextResponse.json(attendance, { status: 201 });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    const message = e instanceof Error ? e.message : "Failed to record attendance";
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes("Only ACTIVE")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
