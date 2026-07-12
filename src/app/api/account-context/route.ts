import { NextResponse } from "next/server";
import { z } from "zod";
import { createApiHandler, ApiErrors } from "@/lib/api-handler";
import { userCanAccessAccount } from "@/lib/account-scope";
import { ACCOUNT_COOKIE_NAME } from "@/lib/account-constants";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const bodySchema = z.object({ accountId: z.string().uuid() });

/** Set active account for dashboard session (multi-org switch). */
export const POST = createApiHandler(
  async (_request, { session, body }) => {
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.validationError("Validation failed", parsed.error.issues);
    }
    const accountId = parsed.data.accountId;
    const allowed = await userCanAccessAccount(session.user.id, accountId);
    if (!allowed) {
      return ApiErrors.forbidden("You do not have access to this account.");
    }
    const res = NextResponse.json({ ok: true, accountId });
    res.cookies.set(ACCOUNT_COOKIE_NAME, accountId, {
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
