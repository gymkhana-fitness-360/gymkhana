import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { sendMemberOtp } from "@/domains/member-auth/otp";

const bodySchema = z.object({
  gymId: z.string().uuid(),
  phone: z.string().min(10).max(15),
});

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const result = await sendMemberOtp(parsed.data.gymId, parsed.data.phone);
  if (!result.ok) {
    return ApiErrors.notFound("Member not found for this gym and phone");
  }

  return successResponse(result);
}
