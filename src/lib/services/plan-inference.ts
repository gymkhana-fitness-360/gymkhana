/**
 * PLAN INFERENCE
 * 
 * Infer plan ID from payment amount when planId is missing.
 * Used as fallback to ensure memberships are always created.
 */

import { BUSINESS_RULES } from "@/lib/business-rules";
import { createLogger } from "@/lib/logger";

const logger = createLogger("plan-inference");

export interface PlanInference {
  planId: string;
  durationDays: number;
  confidence: "exact" | "approximate" | "fallback";
}

export interface PlanCatalogEntry {
  id: string;
  durationDays: number;
  price: number;
}

/**
 * Default plan ID for all monthly renewals/payments.
 * This is a generic "monthly" plan that accepts any payment amount.
 */
export const DEFAULT_MONTHLY_PLAN_ID = "monthly";

/**
 * Infer plan from payment amount
 * 
 * BUSINESS RULE: Default to "monthly" plan (30 days) for most payments.
 * The monthly plan can accept any payment value - amount doesn't determine the plan.
 */
export function inferPlanFromAmount(
  amount: number,
  plans: PlanCatalogEntry[] = []
): PlanInference {
  if (plans.length > 0 && Number.isFinite(amount) && amount > 0) {
    // GUARD: Ensure default plan exists in catalog
    const defaultPlan = plans.find(p => p.id === BUSINESS_RULES.PLAN.DEFAULT_PLAN_ID);
    if (!defaultPlan) {
      logger.error(
        `[PLAN] Default plan '${BUSINESS_RULES.PLAN.DEFAULT_PLAN_ID}' not found in catalog of ${plans.length} plans`
      );
    }

    const sortedByDiff = [...plans].sort((a, b) => {
      const diffA = Math.abs(a.price - amount);
      const diffB = Math.abs(b.price - amount);
      if (diffA === diffB) return a.durationDays - b.durationDays;
      return diffA - diffB;
    });

    const best = sortedByDiff[0];
    const isExact = Math.abs(best.price - amount) < 0.01;

    return {
      planId: best.id,
      durationDays: best.durationDays,
      confidence: isExact ? "exact" : "approximate",
    };
  }

  // Fallback: monthly plan (30 days)
  // GUARD: Log when falling back to default plan
  if (plans.length === 0) {
    logger.warn(
      `[PLAN] No plans provided for amount ₹${amount}, using fallback '${DEFAULT_MONTHLY_PLAN_ID}'`
    );
  }

  return {
    planId: DEFAULT_MONTHLY_PLAN_ID,
    durationDays: 30,
    confidence: "fallback",
  };
}
