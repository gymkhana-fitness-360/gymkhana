import { NextResponse } from "next/server";
import { listGymsForUser } from "@/lib/gym-scope";
import type { Session } from "next-auth";

export async function listGymsHandler(_request: Request, session: Session) {
  const gyms = await listGymsForUser(session.user.id);
  return NextResponse.json({ gyms });
}
