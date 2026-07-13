import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDaysIST, toDateOnlyIST } from "@/lib/date-only";
import { getWhatsAppService } from "@/lib/whatsapp";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { errorResponse } from "@/lib/api-response";
import { sendPaymentReceiptEmail } from "@/lib/email/send";
import { WHATSAPP_NOT_CONFIGURED, WHATSAPP_SETUP_HINT } from "@/lib/messaging/whatsapp-copy";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";

const logger = createLogger("api-payments");

function formatBillMessage(
  type: "admission" | "renewal",
  data: {
    name: string;
    amount: string;
    paymentMethod: string;
    phoneNumber: string;
    validFrom: string;
    validTill: string;
    memberId?: string;
  }
): string {
  if (type === "admission") {
    return `🎉 *Welcome to Gymkhana Fitness 360™, Bansberia!* 🎉

👤 *Member Details*
━━━━━━━━━━━━━━━━━━
📛 Name: ${data.name}
🆔 Member ID: ${data.memberId || "—"}
📞 Phone: ${data.phoneNumber}

📅 *Membership Validity*
━━━━━━━━━━━━━━━━━━
✅ Valid From: ${data.validFrom}
📆 Valid Till: ${data.validTill}

📞 *Contact Us*
Phone: 9831947879
Team Gymkhana Fitness 360™

_Let's achieve your fitness goals together!_ 🏋️‍♂️`;
  }
  return `💳 *Membership Renewal Receipt*

🎉 Thank you for renewing, ${data.name}!

📄 *Payment Details*
━━━━━━━━━━━━━━━━━━
💰 Amount Paid: ₹${data.amount}
💳 Payment Method: ${data.paymentMethod}
📞 Phone: ${data.phoneNumber}

📅 *New Validity Period*
━━━━━━━━━━━━━━━━━━
✅ Valid From: ${data.validFrom}
📆 Valid Till: ${data.validTill}

📞 *Contact Us*
Phone: 9831947879
Team Gymkhana Fitness 360™

_Keep pushing towards your goals!_ 💪`;
}

/**
 * POST /api/payments/[id]/send-bill
 * Send bill/receipt via WhatsApp for a payment.
 */
export async function sendPaymentBillHandler(
  request: NextRequest,
  params: { id: string },
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id } = params;
    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected or account has no locations.");
    }

    const payment = await prisma.payment.findFirst({
      where: { id, gymId },
      include: {
        Member: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!payment) {
      return ApiErrors.notFound("Payment");
    }

    if (payment.billSentAt) {
      return ApiErrors.validationError("Bill already sent", {
        sentAt: payment.billSentAt,
      });
    }

    const phone = payment.Member.phone?.replace(/\D/g, "") || "";
    if (phone.length < 10) {
      return ApiErrors.validationError("Member has no valid phone number");
    }

    const isAdmission = payment.packageDuration === "New Admission";
    const receivedAt = toDateOnlyIST(payment.receivedAt);
    const validFrom = receivedAt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
    const validTill = addDaysIST(receivedAt, 30);
    const validTillStr = validTill.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const methodMap: Record<string, string> = {
      UPI: "UPI",
      CASH: "Cash",
      CARD: "Card",
      BANK_TRANSFER: "Bank Transfer",
      CHEQUE: "Cheque",
      ONLINE: "Online",
      MIXED: "Mixed",
      OTHER: "Other",
    };

    const message = formatBillMessage(
      isAdmission ? "admission" : "renewal",
      {
        name: payment.Member.name,
        amount: String(payment.amount),
        paymentMethod: methodMap[payment.method] || payment.method,
        phoneNumber: payment.Member.phone || "",
        validFrom,
        validTill: validTillStr,
        memberId: payment.Member.id,
      }
    );

    const whatsapp = getWhatsAppService();
    const status = whatsapp.getStatus();
    if (!status.hasSession) {
      await whatsapp.initialize();
    }
    if (!status.isAuthenticated) {
      const ok = await whatsapp.checkAuthentication();
      if (!ok) {
        return errorResponse(
          `${WHATSAPP_NOT_CONFIGURED} ${WHATSAPP_SETUP_HINT}`,
          "INTERNAL_ERROR",
          503
        );
      }
    }

    const success = await whatsapp.sendMessage(payment.Member.phone!, message);

    if (success) {
      await prisma.payment.update({
        where: { id },
        data: { billSentAt: new Date() },
      });

      if (payment.Member.email) {
        const gym = await prisma.gym.findUnique({
          where: { id: gymId },
          select: { name: true },
        });
        await sendPaymentReceiptEmail({
          to: payment.Member.email,
          memberName: payment.Member.name,
          amount: Number(payment.amount),
          paymentDate: validFrom,
          gymName: gym?.name ?? "Fitness360",
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `Bill sent to ${payment.Member.name}`,
      });
    }

    return ApiErrors.internal("Failed to send message via WhatsApp");
  } catch (error) {
    logger.error("[POST /api/payments/[id]/send-bill]", error as Error);
    return ApiErrors.internal(
      error instanceof Error ? error.message : "Failed to send bill"
    );
  }
}
