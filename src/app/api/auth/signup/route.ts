import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  normalizeAuthEmail,
  provisionOwnerAccount,
} from "@/lib/auth/provision-owner";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100),
});

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const parsed = await parseJsonBody(request, signupSchema);
  if (!parsed.ok) return parsed.response;

  const email = normalizeAuthEmail(parsed.data.email);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { contactNumber: `e:${email}` }],
    },
    select: { id: true },
  });

  if (existing) {
    return ApiErrors.validationError("An account with this email already exists");
  }

  const user = await provisionOwnerAccount({
    email,
    name: parsed.data.name,
    password: parsed.data.password,
  });

  return NextResponse.json(
    {
      success: true,
      userId: user.id,
      message: "Account created. You can sign in now.",
    },
    { status: 201 },
  );
}
