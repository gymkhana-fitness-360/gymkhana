import type { NextRequest } from "next/server";
import { importPaymentsFromWhatsAppHandler } from "@/domains/payments/handlers/import-payments-from-whatsapp";

export async function POST(request: NextRequest) {
  return importPaymentsFromWhatsAppHandler(request);
}
