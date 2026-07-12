import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IAttendanceService } from "../interfaces";
import type { AttendanceListResultDTO } from "../types";
import { ApiErrors } from "@/lib/api-handler";

const listQuerySchema = z.object({
  memberId: z.string().min(1).optional(),
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function listAttendanceHandler(
  req: NextRequest,
  attendanceService: IAttendanceService
): Promise<NextResponse<AttendanceListResultDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const raw = {
      memberId: req.nextUrl.searchParams.get("memberId") ?? undefined,
      date: req.nextUrl.searchParams.get("date") ?? undefined,
      startDate: req.nextUrl.searchParams.get("startDate") ?? undefined,
      endDate: req.nextUrl.searchParams.get("endDate") ?? undefined,
    };
    const parsed = listQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return ApiErrors.validationError("Invalid query parameters", parsed.error.issues);
    }
    const result = await attendanceService.listAttendance({
      gymId,
      ...parsed.data,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
