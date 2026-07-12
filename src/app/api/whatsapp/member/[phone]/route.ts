import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { requireApiGymId } from "@/lib/api/gym-context";

const logger = createLogger("api-whatsapp");

/**
 * Get member by phone - used by WhatsApp forms for auto-fill.
 * Proxies member lookup to avoid CORS when deployed.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    const gymId = await requireApiGymId(session, request);
    if (gymId instanceof NextResponse) {
      return gymId;
    }

    const { phone } = await params;
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      return ApiErrors.validationError("Invalid phone number");
    }

    const member = await prisma.member.findFirst({
      where: {
        gymId,
        phone: { contains: digits },
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    if (member) {
      return NextResponse.json({
        success: true,
        data: {
          id: member.id,
          name: member.name,
          phone: member.phone,
          memberExternalId: member.id,
        },
      });
    }

    return NextResponse.json({
      success: false,
      message: "Member not found",
    });
  } catch (error) {
    logger.error("[whatsapp/member]", error as Error);
    return ApiErrors.internal("Failed to fetch member");
  }
}
