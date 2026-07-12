import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { listOverdueMembersResponse } from "@/domains/collections/handlers/list-overdue";

const logger = createLogger("api-overdue");

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return listOverdueMembersResponse(session, request);
  } catch (error) {
    logger.error("Error fetching overdue members:", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch overdue members" },
      { status: 500 },
    );
  }
}
