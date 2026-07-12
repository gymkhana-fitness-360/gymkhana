import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { userCanAccessGym } from "@/lib/gym-scope";
import { GYM_COOKIE_NAME } from "@/lib/gym-constants";
import { createApiHandler, ApiErrors } from "@/lib/api-handler";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const bodySchema = z.object({ gymId: z.string().min(1) });

export const POST = createApiHandler(
  async (_request, { session, body }) => {
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.validationError("Validation failed", parsed.error.issues);
    }
    const gymId = parsed.data.gymId.trim();
    const allowed = await userCanAccessGym(session.user.id, gymId);
    if (!allowed) {
      return ApiErrors.forbidden("You do not have access to this gym.");
    }
    const res = NextResponse.json({ ok: true, gymId });
    res.cookies.set(GYM_COOKIE_NAME, gymId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  },
  { rateLimit: "moderate" },
);
