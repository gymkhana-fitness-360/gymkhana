import { NextRequest } from "next/server";
import { whatsappMemberByPhoneHandler } from "@/domains/communications/handlers/whatsapp-member";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> },
) {
  const { phone } = await params;
  return whatsappMemberByPhoneHandler(request, phone);
}
