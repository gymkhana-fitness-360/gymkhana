import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { verifyMemberOtp } from "@/domains/member-auth/otp";
import { signMemberSession } from "@/lib/member-session";

const bodySchema = z.object({
  gymId: z.string().uuid(),
  phone: z.string().min(10).max(15),
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const result = await verifyMemberOtp(
    parsed.data.gymId,
    parsed.data.phone,
    parsed.data.code,
  );

  if (!result.ok) {
    return ApiErrors.validationError(result.error);
  }

  const token = signMemberSession(result.memberId, result.gymId);
  const res = successResponse({
    memberId: result.memberId,
    gymId: result.gymId,
  });
  const json = await res.json();
  const response = NextResponse.json(json, { status: 200 });
  response.cookies.set("member_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  return response;
}
