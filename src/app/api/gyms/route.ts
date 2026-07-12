import { NextResponse } from "next/server";
import { listGymsForUser } from "@/lib/gym-scope";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(
  async (_request, { session }) => {
    const gyms = await listGymsForUser(session.user.id);
    return NextResponse.json({ gyms });
  },
  { rateLimit: "lenient" },
);
