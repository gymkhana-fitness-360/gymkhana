import { NextResponse } from "next/server";
import { listAccountsForUser } from "@/lib/account-scope";
import type { Session } from "next-auth";

/** List accounts the signed-in user belongs to (franchise / agency multi-org). */
export async function listAccountsHandler(_request: Request, session: Session) {
  const accounts = await listAccountsForUser(session.user.id);
  return NextResponse.json({ accounts });
}
