import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import { listAccountsForUser } from "@/lib/account-scope";

/** List accounts the signed-in user belongs to (franchise / agency multi-org). */
export const GET = createApiHandler(
  async (_request, { session }) => {
    const accounts = await listAccountsForUser(session.user.id);
    return NextResponse.json({ accounts });
  },
  { rateLimit: "moderate" },
);
