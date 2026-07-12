import type { NextRequest } from "next/server";
import { deduplicatePaymentsHandler } from "@/domains/payments/handlers/deduplicate-payments";

export async function POST(request: NextRequest) {
  return deduplicatePaymentsHandler(request);
}
