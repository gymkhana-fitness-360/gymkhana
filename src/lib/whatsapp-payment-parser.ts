/**
 * Parse payment-related messages from WhatsApp Admin Gym group.
 * Supports formats like:
 * - "Guriya Chowdhury 800/- upi renewal"
 * - "Member Name 750 cash new"
 * - "200 cash out" (expense)
 */

import { BUSINESS_RULES } from "@/lib/business-rules";
import { createLogger } from "@/lib/logger";

const logger = createLogger("whatsapp-payment-parser");

export type ParsedMemberPayment = {
  type: 'member_payment';
  memberName: string;
  amount: number;
  method: 'UPI' | 'CASH' | 'CARD' | 'OTHER';
  paymentType: string; // renewal, new, topup, etc.
  raw: string;
  lineNumber: number;
};

export type ParsedCashOut = {
  type: 'cash_out';
  amount: number;
  raw: string;
  lineNumber: number;
};

export type ParsedCashUpdate = {
  type: 'cash_update';
  balance?: number;
  raw: string;
  lineNumber: number;
};

export type ParsedError = {
  type: 'error';
  error: string;
  raw: string;
  lineNumber: number;
};

export type ParsedPayment = ParsedMemberPayment | ParsedCashOut | ParsedCashUpdate | ParsedError;

const AMOUNT_PATTERN = /(\d+(?:\.\d+)?)\s*(?:\/-|₹|rs\.?|inr)?/i;
const METHOD_MAP: Record<string, 'UPI' | 'CASH' | 'CARD' | 'OTHER'> = {
  upi: 'UPI',
  cash: 'CASH',
  card: 'CARD',
  gpay: 'UPI',
  phonepe: 'UPI',
  paytm: 'UPI',
};

function normalizeMethod(text: string): 'UPI' | 'CASH' | 'CARD' | 'OTHER' {
  const lower = text.toLowerCase();
  for (const [key, method] of Object.entries(METHOD_MAP)) {
    if (lower.includes(key)) return method;
  }
  return 'CASH'; // default for Indian gym context
}

function extractAmount(text: string): number | null {
  const match = text.match(AMOUNT_PATTERN);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}

/**
 * Parse a single line into a member payment if it matches patterns like:
 * "Name Amount method type" or "Name Amount/- method type"
 * 
 * ENHANCED VALIDATION: Returns ParsedError for invalid data
 */
function parseMemberPaymentLine(line: string, lineNum: number): ParsedMemberPayment | ParsedError | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 5) return null;

  // Skip cash box updates and cash out
  if (/cash\s*out|box\s*a\s*ache|cash\s*update/i.test(trimmed)) return null;

  // Find amount - typically before method words
  const amountMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:\/-)?/);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1]);
  
  // GUARD: Validate amount is a valid number
  if (isNaN(amount)) {
    logger.warn(`[WHATSAPP] Invalid amount in line ${lineNum}: ${trimmed}`);
    return {
      type: 'error',
      error: 'Invalid amount (not a number)',
      raw: trimmed,
      lineNumber: lineNum,
    };
  }
  
  // GUARD: Check minimum amount threshold
  if (amount < BUSINESS_RULES.PAYMENT.MIN_AMOUNT) {
    logger.warn(`[WHATSAPP] Amount below minimum (₹${BUSINESS_RULES.PAYMENT.MIN_AMOUNT}) in line ${lineNum}: ₹${amount}`);
    return {
      type: 'error',
      error: `Amount ₹${amount} below minimum ₹${BUSINESS_RULES.PAYMENT.MIN_AMOUNT}`,
      raw: trimmed,
      lineNumber: lineNum,
    };
  }
  
  // GUARD: Check maximum amount threshold
  if (amount > BUSINESS_RULES.PAYMENT.MAX_AMOUNT) {
    logger.warn(`[WHATSAPP] Amount above maximum (₹${BUSINESS_RULES.PAYMENT.MAX_AMOUNT}) in line ${lineNum}: ₹${amount}`);
    return {
      type: 'error',
      error: `Amount ₹${amount} above maximum ₹${BUSINESS_RULES.PAYMENT.MAX_AMOUNT}`,
      raw: trimmed,
      lineNumber: lineNum,
    };
  }

  const amountIndex = trimmed.indexOf(amountMatch[0]);
  const beforeAmount = trimmed.slice(0, amountIndex).trim();
  const afterAmount = trimmed.slice(amountIndex + amountMatch[0].length).trim();

  // Member name is before the amount (at least 2 chars)
  const memberName = beforeAmount.replace(/\s+/g, ' ').trim();
  
  // GUARD: Validate member name length
  if (!memberName || memberName.length < BUSINESS_RULES.VALIDATION.NAME.MIN_LENGTH) {
    logger.warn(`[WHATSAPP] Invalid name (too short) in line ${lineNum}: "${memberName}"`);
    return {
      type: 'error',
      error: `Invalid name "${memberName}" (minimum ${BUSINESS_RULES.VALIDATION.NAME.MIN_LENGTH} characters)`,
      raw: trimmed,
      lineNumber: lineNum,
    };
  }
  
  // GUARD: Validate member name is not just numbers
  if (/^\d+$/.test(memberName)) {
    logger.warn(`[WHATSAPP] Invalid name (only numbers) in line ${lineNum}: "${memberName}"`);
    return {
      type: 'error',
      error: `Invalid name "${memberName}" (cannot be only numbers)`,
      raw: trimmed,
      lineNumber: lineNum,
    };
  }

  const method = normalizeMethod(afterAmount);
  
  // GUARD: Warn if no payment method detected (defaulting to CASH)
  if (!afterAmount || afterAmount.length === 0) {
    logger.warn(`[WHATSAPP] No payment method specified in line ${lineNum}, defaulting to CASH`);
  }
  
  const paymentType = afterAmount.toLowerCase().includes('renewal')
    ? 'renewal'
    : afterAmount.toLowerCase().includes('new')
    ? 'new'
    : 'renewal';

  return {
    type: 'member_payment',
    memberName,
    amount,
    method,
    paymentType,
    raw: trimmed,
    lineNumber: lineNum,
  };
}

/**
 * Parse "200 cash out" style lines
 */
function parseCashOutLine(line: string, lineNum: number): ParsedCashOut | null {
  const match = line.match(/^(\d+(?:\.\d+)?)\s*cash\s*out/i);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  return isNaN(amount) ? null : { type: 'cash_out', amount, raw: line.trim(), lineNumber: lineNum };
}

/**
 * Parse "Cash update Box a ache 1517/-" style lines (optional)
 */
function parseCashUpdateLine(line: string, lineNum: number): ParsedCashUpdate | null {
  if (!/cash\s*update|box\s*a\s*ache/i.test(line)) return null;
  const amount = extractAmount(line);
  return {
    type: 'cash_update',
    balance: amount ?? undefined,
    raw: line.trim(),
    lineNumber: lineNum,
  };
}

/**
 * Parse raw WhatsApp message text (multiple lines) into structured payment data.
 * 
 * ENHANCED: Returns ParsedError for invalid lines instead of silently skipping
 */
export function parseWhatsAppPayments(text: string): ParsedPayment[] {
  const results: ParsedPayment[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  logger.info(`[WHATSAPP] Parsing ${lines.length} lines from WhatsApp import`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    try {
      const cashOut = parseCashOutLine(line, lineNum);
      if (cashOut) {
        results.push(cashOut);
        continue;
      }

      const cashUpdate = parseCashUpdateLine(line, lineNum);
      if (cashUpdate) {
        results.push(cashUpdate);
        continue;
      }

      const memberPayment = parseMemberPaymentLine(line, lineNum);
      if (memberPayment) {
        results.push(memberPayment);
      }
    } catch (error) {
      // Catch any unexpected parsing errors
      logger.error(
        `[WHATSAPP] Unexpected error parsing line ${lineNum}`,
        error instanceof Error ? error : new Error(String(error))
      );
      results.push({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
        raw: line.trim(),
        lineNumber: lineNum,
      });
    }
  }

  const successCount = results.filter(r => r.type === 'member_payment').length;
  const errorCount = results.filter(r => r.type === 'error').length;
  logger.info(`[WHATSAPP] Parsed ${successCount} payments, ${errorCount} errors`);

  return results;
}
