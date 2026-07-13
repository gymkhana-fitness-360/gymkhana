import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseWhatsAppPayments, ParsedMemberPayment } from "@/lib/whatsapp-payment-parser";
import { ensurePaymentProcessedOnce, markPaymentProcessed, createIdempotencyKey } from "@/lib/idempotency";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createPayment } from "@/lib/services/payment.service";
import { toDateOnlyIST } from "@/lib/date-only";
import { BUSINESS_RULES } from "@/lib/business-rules";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";

const logger = createLogger("api-payments");

export async function importPaymentsFromWhatsAppHandler(request: NextRequest) {
  try {
    const rateLimitRes = withRateLimit(request, "moderate");
    if (rateLimitRes) return rateLimitRes;

    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }
    if (session.user?.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request)
    );
    if (!gymId) {
      return NextResponse.json(
        { error: "No gym selected. Choose a location in the header." },
        { status: 400 }
      );
    }

    const bodySchema = z.object({
      messages: z.string().min(1),
      receivedAt: z.string().optional(),
    });
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return ApiErrors.validationError("Validation failed", parsed.error.issues);
    }
    const { messages, receivedAt } = parsed.data;

    const parsedPayments = parseWhatsAppPayments(messages);
    const memberPayments = parsedPayments.filter(
      (p): p is ParsedMemberPayment => p.type === "member_payment"
    );

    const dateToUse = receivedAt ? new Date(receivedAt) : new Date();
    const results: { created: number; skipped: number; errors: Array<{ line: number; error: string }> } = {
      created: 0,
      skipped: 0,
      errors: [],
    };

    // Fetch members once and match by name in-memory (was a findFirst per line — N+1).
    const gymMembers = await prisma.member.findMany({
      where: { gymId },
      include: {
        Membership: {
          orderBy: { endDate: "desc" },
          take: 1,
          include: { Plan: true },
        },
      },
    });
    const findMemberByName = (name: string) => {
      const needle = name.toLowerCase();
      return gymMembers.find((m) => m.name.toLowerCase().includes(needle)) ?? null;
    };

    for (const pm of memberPayments) {
      try {
        const member = findMemberByName(pm.memberName);

        if (!member) {
          results.errors.push({
            line: pm.lineNumber,
            error: `Member not found: "${pm.memberName}"`,
          });
          results.skipped++;
          continue;
        }

        const idempotencyKey = createIdempotencyKey(
          "whatsapp",
          member.id,
          String(pm.amount),
          dateToUse.toISOString().slice(0, 10),
          pm.lineNumber.toString()
        );
        const { alreadyProcessed } = await ensurePaymentProcessedOnce(gymId, idempotencyKey);
        if (alreadyProcessed) {
          results.skipped++;
          continue;
        }

        // BUSINESS RULE: Infer plan from payment amount, not from history
        // If someone paid ₹2000 for PT, create PT membership even if their last was gym
        // planId will be inferred from amount by payment.service
        const result = await createPayment({
          memberId: member.id,
          gymId: member.gymId,
          amount: pm.amount,
          paymentMethod: pm.method,
          paymentDate: toDateOnlyIST(dateToUse),
          planId: "", // Empty string triggers inference from amount
          duration: pm.paymentType.includes("month") ? "monthly" : null,
          userId: session.user.id,
          notes: `WhatsApp import: ${pm.paymentType}`,
        });

        if (!result.isDuplicate) {
          await markPaymentProcessed(gymId, idempotencyKey, result.payment.id);
          results.created++;
        } else {
          results.skipped++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.errors.push({ line: pm.lineNumber, error: msg });
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      parsed: memberPayments.length,
      ...results,
      cashUpdates: parsedPayments.filter((p) => p.type === "cash_update").length,
      cashOuts: parsedPayments.filter((p) => p.type === "cash_out").length,
    });
  } catch (error) {
    logger.error("WhatsApp payment import error:", error as Error);
    return NextResponse.json(
      { error: "Failed to import payments" },
      { status: 500 }
    );
  }
}
