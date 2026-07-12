"use strict";

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { findSimilarMembers } from "@/lib/similar-names";
import { logAction } from "@/lib/audit-logger";
import { createPayment } from "@/lib/services/payment.service";
import { createAdmission } from "@/lib/services/admission.service";
import { parsePaymentText, toTitleCase, parseFlexibleDate, ParsedPayment } from "@/lib/services/text-parser.service";
import { todayIST } from "@/lib/date-only";
import { BulkEntryResult, BulkEntryError } from "@/lib/types/service-types";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { BusinessRuleViolation } from "@/lib/crud-business-validation";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import {
  validateQuickEntryMemberName,
  validateQuickEntryPaymentDate,
  resolveQuickEntryMember,
} from "@/lib/quick-entry-validation";

const logger = createLogger("api-payments");

// Constants - no more magic strings
const DEFAULT_PHONE = "0000000000";
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 500;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

/** Calculate total amount from parsed payment */
function calculateTotalAmount(parsed: ParsedPayment): number {
  return parsed.splitPayments
    ? parsed.splitPayments.reduce((s, p) => s + p.amount, 0)
    : parsed.amount ?? 0;
}

/** Invalidate all payment-related caches (async, non-blocking) */
function invalidatePaymentCaches(): void {
  // Run cache invalidation asynchronously without blocking response
  Promise.all([
    revalidateTag("members", "max"),
    revalidateTag("dashboard", "max"),
    revalidateTag("payments", "max"),
  ]).catch((err) => logger.error("Cache invalidation error:", err));
}

/**
 * QUICK ENTRY API
 * 
 * Refactored to use shared services:
 * - payment.service.ts for payment creation
 * - admission.service.ts for new member admissions
 * - membership.service.ts (via payment.service) for membership management
 * - text-parser.service.ts for parsing natural language input
 * 
 * NO MORE:
 * - Duplicate detection logic (now in payment.service)
 * - Membership creation logic (now in membership.service)
 * - Date calculations (now in date-only.ts with IST)
 * - Magic numbers (now in business-rules.ts)
 */

/**
 * Sleep utility for backoff
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Retryable error patterns */
const RETRYABLE_ERROR_PATTERNS = [
  '429', 'rate limit', 'too many requests', 'timeout',
  'transaction already closed', 'connection', 'econnreset', 'etimedout'
];

function isRetryableError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return RETRYABLE_ERROR_PATTERNS.some(pattern => msg.includes(pattern));
}

/**
 * Retry with exponential backoff for rate limits (429) and transient errors
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES,
  baseDelayMs = BASE_RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (!isRetryableError(lastError) || attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelayMs * Math.pow(2, attempt);
      logger.warn(`[QUICK-ENTRY] Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${lastError.message}`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Process a single entry with retry logic
 */
async function processSingleEntry(
  entry: string,
  commonDate: Date | null,
  receivedById: string,
  gymId: string
): Promise<{ result?: BulkEntryResult; error?: BulkEntryError }> {
  const parsed = parsePaymentText(entry);

  if ((!parsed.amount && !parsed.splitPayments) || !parsed.name) {
    return { error: { entry, error: "Could not parse entry", parsed } };
  }

  const nameCheck = validateQuickEntryMemberName(parsed.name);
  if (!nameCheck.ok) {
    return { error: { entry, error: nameCheck.message, invalidName: true, parsed } };
  }

  const titleCaseName = toTitleCase(parsed.name);
  const isNewAdmission = parsed.duration === "New Admission";
  const paymentDate = commonDate || parsed.date || todayIST();

  const dateCheck = validateQuickEntryPaymentDate(paymentDate);
  if (!dateCheck.ok) {
    return { error: { entry, error: dateCheck.message, invalidDate: true, parsed } };
  }

  const resolved = await resolveQuickEntryMember(prisma, parsed, { gymId });

  if (isNewAdmission && resolved.kind === "none") {
    const phone = parsed.phone || DEFAULT_PHONE;
    const totalAmount = calculateTotalAmount(parsed);

    const admissionMethod =
      parsed.splitPayments && parsed.splitPayments.length > 0
        ? PaymentMethod.MIXED
        : (parsed.method ?? PaymentMethod.MIXED);
    
    const admissionResult = await withRetry(() =>
      createAdmission({
        gymId,
        name: titleCaseName,
        phone,
        amount: totalAmount,
        paymentMethod: admissionMethod,
        paymentDate,
        duration: parsed.duration,
        userId: receivedById,
        notes: `Bulk entry: ${entry}`,
        splitPayments: parsed.splitPayments || undefined,
      })
    );

    return {
      result: {
        member: admissionResult.member.name,
        amount: totalAmount,
        method: parsed.method || "MIXED",
        payments: 1,
        date: paymentDate.toLocaleDateString("en-IN"),
      }
    };
  }

  if (resolved.kind === "ambiguous") {
    return {
      error: {
        entry,
        error: `Multiple members match "${titleCaseName}". Add phone on the line or use a fuller name.`,
        ambiguousMember: true,
        candidates: resolved.candidates,
        parsed,
      }
    };
  }

  if (resolved.kind === "phone_mismatch") {
    return { error: { entry, error: "Phone verification failed.", parsed } };
  }

  if (resolved.kind === "none") {
    const similarNames = await findSimilarMembers(prisma, parsed.name, gymId, 3);
    return {
      error: {
        entry,
        error: `Member "${titleCaseName}" not found. Use "admission" for new members.`,
        similarNames: similarNames.map((m) => ({ id: m.id, name: m.name, phone: m.phone })),
        parsed,
      }
    };
  }

  const member = resolved.member;

  // Check if member has membership (for renewals)
  if (!isNewAdmission) {
    const membershipCount = await prisma.membership.count({ where: { memberId: member.id } });
    if (membershipCount === 0) {
      return {
        error: {
          entry,
          error: `"${titleCaseName}" has no membership. Add member via Members page first, or use "admission" for new join.`,
        }
      };
    }
  }

  // Create payment using service with retry
  const totalAmount = calculateTotalAmount(parsed);

  const paymentResult = await withRetry(() =>
    createPayment({
      memberId: member.id,
      gymId,
      amount: totalAmount,
      paymentMethod: parsed.method ?? PaymentMethod.MIXED,
      paymentDate,
      planId: parsed.duration || "",
      duration: parsed.duration,
      userId: receivedById,
      notes: `Bulk entry: ${entry}`,
    })
  );

  if (paymentResult.isDuplicate) {
    return {
      error: {
        entry,
        error: "Possible duplicate payment",
        duplicate: true,
        existingPayment: {
          id: paymentResult.payment.id,
          amount: Number(paymentResult.payment.amount),
          receivedAt: paymentResult.payment.receivedAt,
          memberName: member.name,
        },
      }
    };
  }

  return {
    result: {
      member: member.name,
      amount: totalAmount,
      method: parsed.method || "MIXED",
      payments: 1,
      date: paymentDate.toLocaleDateString('en-IN'),
    }
  };
}

/**
 * Handle bulk entry processing with batching and retry logic
 */
async function handleBulkEntry(
  text: string,
  receivedById: string,
  gymId: string
): Promise<NextResponse> {
  const results: BulkEntryResult[] = [];
  const errors: BulkEntryError[] = [];
  
  // Extract common date if specified
  let commonDate: Date | null = null;
  const dateMatch = text.match(/all dates?\s+(.+?)(?:\n|$)/i);
  if (dateMatch) {
    commonDate = parseFlexibleDate(dateMatch[1].trim());
    text = text.replace(/all dates?\s+.+?(?:\n|$)/i, '');
  }
  
  // Split by comma or newline
  const entries = text.split(/[,\n]+/).map(e => e.trim()).filter(e => e.length > 0);
  
  // Process in batches to avoid overwhelming the database
  
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    
    // Process batch sequentially (not parallel) to reduce DB load
    for (const entry of batch) {
      try {
        const outcome = await processSingleEntry(entry, commonDate, receivedById, gymId);
        if (outcome.result) {
          results.push(outcome.result);
        }
        if (outcome.error) {
          errors.push(outcome.error);
        }
      } catch (error) {
        errors.push({ entry, error: String(error) });
      }
    }
    
    // Add delay between batches (except for the last batch)
    if (i + BATCH_SIZE < entries.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  if (results.length > 0) {
    // Run cache invalidation and logging asynchronously without blocking response
    invalidatePaymentCaches();
    logAction(receivedById, "payment_created", "Payment", "bulk", {
      bulk: true,
      count: results.length,
      members: results.map(r => r.member),
    }).catch(() => {});
  }

  // Return partial success - some entries may have failed
  const allSucceeded = errors.length === 0;
  return NextResponse.json({
    success: allSucceeded,
    partialSuccess: !allSucceeded && results.length > 0,
    bulk: true,
    processed: results.length,
    failed: errors.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
    message: allSucceeded 
      ? `All ${results.length} entries processed successfully`
      : `Bulk entry: ${results.length} successful, ${errors.length} failed`,
  });
}

/**
 * GET - Method not allowed
 */
export async function handleQuickEntryGet() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST with { text: string } in body." },
    { status: 405 }
  );
}

/**
 * POST - Quick entry (caller must enforce auth + rate limit).
 */
export async function handleQuickEntryPost(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    // Verify user exists
    let receivedById = session.user.id;
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    
    if (!dbUser) {
      const fallback = await prisma.user.findFirst({
        where: { role: "ADMIN", isActive: true },
        select: { id: true },
      });
      if (!fallback) {
        return NextResponse.json(
          { error: "Your account was not found. Please log out and log in again." },
          { status: 401 }
        );
      }
      receivedById = fallback.id;
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

    // Parse request body
    let body: {
      text?: string;
      useMemberId?: string;
      confirmDuplicate?: boolean;
      verifyPhone?: string;
      pendingMemberId?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body. Expected { text: string }" },
        { status: 400 }
      );
    }

    const text = body?.text;
    const useMemberId = body?.useMemberId as string | undefined;
    const confirmDuplicate = body?.confirmDuplicate === true;
    const verifyPhone =
      typeof body?.verifyPhone === "string" ? body.verifyPhone.trim() : undefined;
    const pendingMemberId =
      typeof body?.pendingMemberId === "string" ? body.pendingMemberId.trim() : undefined;
    
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Invalid input. Body must include 'text' as a non-empty string." },
        { status: 400 }
      );
    }

    // Check if bulk entry (commas, newlines, or "all dates")
    const hasMultipleLines = text.includes('\n') && text.split('\n').filter(l => l.trim()).length > 1;
    const isBulkEntry = text.includes(',') || hasMultipleLines || /all dates?/i.test(text);
    if (isBulkEntry) {
      return handleBulkEntry(text, receivedById, gymId);
    }

    // Parse single entry
    const parsed = parsePaymentText(text);

    if ((!parsed.amount && !parsed.splitPayments) || !parsed.name) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not parse payment details. Please include amount, method, and name.",
          parsed,
        },
        { status: 400 }
      );
    }

    const nameCheck = validateQuickEntryMemberName(parsed.name);
    if (!nameCheck.ok) {
      return NextResponse.json(
        { success: false, invalidName: true, error: nameCheck.message },
        { status: 400 }
      );
    }

    const titleCaseName = toTitleCase(parsed.name);
    const isNewAdmission = parsed.duration === "New Admission";
    const paymentDate = parsed.date || todayIST();

    const dateCheck = validateQuickEntryPaymentDate(paymentDate);
    if (!dateCheck.ok) {
      return NextResponse.json(
        { success: false, invalidDate: true, error: dateCheck.message },
        { status: 400 }
      );
    }

    const resolved = await resolveQuickEntryMember(prisma, parsed, {
      gymId,
      pendingMemberId: pendingMemberId || undefined,
      verifyPhone: verifyPhone || undefined,
      useMemberId: useMemberId || undefined,
    });

    if (resolved.kind === "phone_mismatch") {
      return NextResponse.json(
        {
          success: false,
          phoneMismatch: true,
          error:
            "Phone does not match this member. Check last 4 digits or enter the full 10-digit number.",
        },
        { status: 400 }
      );
    }

    if (resolved.kind === "ambiguous") {
      return NextResponse.json({
        success: false,
        ambiguousMember: true,
        candidates: resolved.candidates.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
        })),
        error: `Multiple members match "${titleCaseName}". Add phone on the line or use a fuller name.`,
      });
    }

    // New admission only when no existing member resolved
    if (isNewAdmission && resolved.kind === "none") {
      if (!parsed.splitPayments && !parsed.method) {
        return NextResponse.json(
          {
            success: false,
            error: "New admissions require payment method in the entry (e.g. cash/upi/card).",
          },
          { status: 400 }
        );
      }
      const phone = parsed.phone || DEFAULT_PHONE;
      const totalAmount = calculateTotalAmount(parsed);

      try {
        const admissionMethod =
          parsed.splitPayments && parsed.splitPayments.length > 0
            ? PaymentMethod.MIXED
            : (parsed.method ?? PaymentMethod.MIXED);
        
        // Use retry for transient errors
        const admissionResult = await withRetry(() =>
          createAdmission({
            gymId,
            name: titleCaseName,
            phone,
            amount: totalAmount,
            paymentMethod: admissionMethod,
            paymentDate,
            duration: parsed.duration,
            userId: receivedById,
            notes: `Quick entry (admission): ${text}`,
            splitPayments: parsed.splitPayments || undefined,
          })
        );

        const payMsg = parsed.splitPayments
          ? parsed.splitPayments.map(p => `₹${p.amount} ${p.method}`).join(" + ")
          : `₹${parsed.amount} via ${parsed.method}`;

        invalidatePaymentCaches();

        return NextResponse.json({
          success: true,
          payment: { Member: admissionResult.member },
          memberName: admissionResult.member.name,
          paymentAmount: totalAmount,
          message: `New admission: ${admissionResult.member.name} (Member ID: ${admissionResult.member.id}). Payment ${payMsg} recorded.`,
        });
      } catch (error) {
        // Handle duplicate payment error for admissions
        if (error instanceof BusinessRuleViolation && error.code === "PAYMENT_DUPLICATE") {
          try {
            const duplicateData = JSON.parse(error.message);
            return NextResponse.json(
              {
                success: false,
                error: "PAYMENT_DUPLICATE",
                message: duplicateData.message,
                existingPayment: duplicateData.existingPayment,
                canOverride: duplicateData.canOverride,
              },
              { status: 409 }
            );
          } catch (parseError) {
            return NextResponse.json(
              {
                success: false,
                error: "PAYMENT_DUPLICATE",
                message: "Possible duplicate payment detected",
                canOverride: true,
              },
              { status: 409 }
            );
          }
        }
        
        return NextResponse.json(
          { success: false, error: String(error) },
          { status: 400 }
        );
      }
    }

    if (resolved.kind === "none") {
      const similarNames = await findSimilarMembers(prisma, parsed.name, gymId, 5);
      return NextResponse.json(
        {
          success: false,
          error: `Member "${titleCaseName}" not found. Use "admission" for new members.`,
          similarNames: similarNames.map((m) => ({ id: m.id, name: m.name, phone: m.phone })),
          suggestion:
            similarNames.length > 0
              ? "Did you mean one of the names above? Pick a member, then verify phone before payment is recorded."
              : "Use 'admission' in the text for new members, e.g. 999 cash admission John Doe",
        },
        { status: 400 }
      );
    }

    const member = resolved.member;

    // Check if member has membership
    if (!isNewAdmission) {
      const membershipCount = await prisma.membership.count({ where: { memberId: member.id } });
      if (membershipCount === 0) {
        return NextResponse.json(
          { error: `"${titleCaseName}" has no membership. Add member via Members page first, or use "admission" for new join.` },
          { status: 400 }
        );
      }
    }

    // Calculate total amount
    const totalAmount = calculateTotalAmount(parsed);

    // Create payment using service with retry (handles duplicate detection)
    try {
      const paymentResult = await withRetry(() =>
        createPayment({
          memberId: member.id,
          gymId,
          amount: totalAmount,
          paymentMethod: parsed.method ?? PaymentMethod.MIXED,
          paymentDate,
          planId: parsed.duration || "",
          duration: parsed.duration,
          userId: receivedById,
          notes: parsed.splitPayments
            ? `Quick entry (split): ${text}`
            : `Quick entry: ${text}`,
        })
      );

      // Handle duplicate detection
      if (paymentResult.isDuplicate && !confirmDuplicate) {
        return NextResponse.json(
          {
            success: false,
            duplicate: true,
            error: "Possible duplicate payment.",
            existingPayment: {
              id: paymentResult.payment.id,
              amount: Number(paymentResult.payment.amount),
              method: paymentResult.payment.method,
              receivedAt: paymentResult.payment.receivedAt,
              memberName: member.name,
            },
            suggestion: "Add anyway if this is a separate payment, or discard to avoid duplicate.",
          },
          { status: 409 }
        );
      }

      invalidatePaymentCaches();

      const message = parsed.splitPayments
        ? `Split payment of ₹${totalAmount} added for ${member.name} (${parsed.splitPayments.map(p => `₹${p.amount} ${p.method}`).join(' + ')})`
        : `Payment of ₹${totalAmount} added for ${member.name}`;

      return NextResponse.json({
        success: true,
        payment: paymentResult.payment,
        memberName: member.name,
        paymentAmount: totalAmount,
        message,
      });
    } catch (error) {
      // Handle duplicate payment error with 409 status and override option
      if (error instanceof BusinessRuleViolation && error.code === "PAYMENT_DUPLICATE") {
        try {
          const duplicateData = JSON.parse(error.message);
          return NextResponse.json(
            {
              success: false,
              error: "PAYMENT_DUPLICATE",
              message: duplicateData.message,
              existingPayment: duplicateData.existingPayment,
              canOverride: duplicateData.canOverride,
            },
            { status: 409 }
          );
        } catch (parseError) {
          // Fallback if JSON parsing fails
          return NextResponse.json(
            {
              success: false,
              error: "PAYMENT_DUPLICATE",
              message: "Possible duplicate payment detected",
              canOverride: true,
            },
            { status: 409 }
          );
        }
      }
      
      return NextResponse.json(
        { success: false, error: String(error) },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error("[QUICK-ENTRY] Error:", error as Error);
    return NextResponse.json(
      { error: "Failed to add payment", details: String(error) },
      { status: 500 }
    );
  }
}
