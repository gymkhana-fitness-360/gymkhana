import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiGymId } from "@/lib/api/gym-context";

/** GYM-AI-002: agent gateway health (read-only stub). */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) {
    return gymId;
  }
  return NextResponse.json({
    status: "ok",
    version: "v1",
    gymId,
    capabilities: ["health"],
  });
}
