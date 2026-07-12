import { NextResponse } from "next/server";
import ErrorMonitor from "@/lib/error-monitor";
import { createApiHandler, ApiErrors } from "@/lib/api-handler";

const errorMonitor = ErrorMonitor.getInstance();

export const GET = createApiHandler(
  async () => {
    const stats = errorMonitor.getStats();
    return NextResponse.json({
      status: "ok",
      monitoring: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  },
  { rateLimit: "lenient", adminOnly: true },
);

export const DELETE = createApiHandler(
  async () => {
    errorMonitor.clear();
    return NextResponse.json({ success: true, message: "Error logs cleared" });
  },
  { rateLimit: "strict", adminOnly: true },
);
