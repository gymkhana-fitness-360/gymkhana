import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IAttendanceQrService } from "../interfaces";
import type { AttendanceDTO, AttendanceQrPayloadDTO } from "../types";
import { ApiErrors } from "@/lib/api-handler";

const memberIdQuerySchema = z.object({
  memberId: z.string().min(1),
});

const qrCheckInBodySchema = z.object({
  qrData: z.string().min(1),
});

function mapQrError(e: unknown): NextResponse<{ error: string }> {
  if (e instanceof GymContextError) {
    return NextResponse.json({ error: e.message }, { status: e.statusCode });
  }
  const message = e instanceof Error ? e.message : "Request failed";
  if (message.includes("not found")) {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  if (message.includes("Only ACTIVE")) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  if (message.includes("expired") || message.includes("Invalid")) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function generateAttendanceQrHandler(
  req: NextRequest,
  qrService: IAttendanceQrService
): Promise<NextResponse<AttendanceQrPayloadDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const memberId = req.nextUrl.searchParams.get("memberId");
    const parsed = memberIdQuerySchema.safeParse({ memberId: memberId ?? "" });
    if (!parsed.success) {
      return ApiErrors.validationError("Member ID required", parsed.error.issues);
    }
    const payload = await qrService.buildSignedQrPayload(gymId, parsed.data.memberId);
    return NextResponse.json(payload);
  } catch (e) {
    return mapQrError(e);
  }
}

export async function checkInViaQrHandler(
  req: NextRequest,
  qrService: IAttendanceQrService
): Promise<NextResponse<AttendanceDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const json = await req.json().catch(() => null);
    const parsed = qrCheckInBodySchema.safeParse(json);
    if (!parsed.success) {
      return ApiErrors.validationError("Validation failed", parsed.error.issues);
    }
    const attendance = await qrService.checkInWithSignedPayload(
      gymId,
      parsed.data.qrData
    );
    return NextResponse.json(attendance, { status: 201 });
  } catch (e) {
    return mapQrError(e);
  }
}
