import { NextResponse } from "next/server";
import ErrorMonitor from "@/lib/error-monitor";

const errorMonitor = ErrorMonitor.getInstance();

export async function getHealthErrorsHandler() {
  const stats = errorMonitor.getStats();
  return NextResponse.json({
    status: "ok",
    monitoring: true,
    stats,
    timestamp: new Date().toISOString(),
  });
}

export async function clearHealthErrorsHandler() {
  errorMonitor.clear();
  return NextResponse.json({ success: true, message: "Error logs cleared" });
}
