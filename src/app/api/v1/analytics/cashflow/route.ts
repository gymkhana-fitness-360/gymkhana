import { NextRequest, NextResponse } from "next/server";
import { cashflowHandler } from "@/domains/analytics/handlers/cashflow";

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.PUBLIC_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return cashflowHandler(request);
}
