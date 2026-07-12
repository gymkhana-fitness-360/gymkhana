import type { GymReadinessCalibration } from "./calibration";
import { computeMemberPredictions } from "./predictions";
import type { MemberOpportunityInput, OpportunityScoreResult } from "./types";

const PRIORITY_THRESHOLDS = {
  HIGH: 70,
  MEDIUM: 40,
} as const;

/**
 * Deterministic, explainable revenue opportunity score (no LLM).
 */
export function scoreOpportunity(
  input: MemberOpportunityInput,
  calibration: GymReadinessCalibration,
): OpportunityScoreResult {
  const reasons: string[] = [];
  let score = 0;

  // Overdue / expiry urgency (0–35)
  if (input.daysToExpiry < 0) {
    const overdueDays = Math.abs(input.daysToExpiry);
    const urgency = Math.min(35, 15 + overdueDays);
    score += urgency;
    reasons.push(`Membership overdue by ${overdueDays} day(s)`);
  } else if (input.daysToExpiry <= 7) {
    score += 25;
    reasons.push(`Membership expires in ${input.daysToExpiry} day(s)`);
  } else if (input.daysToExpiry <= 14) {
    score += 15;
    reasons.push(`Membership expires in ${input.daysToExpiry} day(s)`);
  }

  // Amount at risk (0–25)
  const amountAtRisk = Math.max(input.overdueAmount, input.membershipValue);
  if (amountAtRisk > 0) {
    const amountScore = Math.min(25, Math.round(amountAtRisk / 500) * 5);
    score += amountScore;
    if (input.overdueAmount > 0) {
      reasons.push(`₹${input.overdueAmount.toLocaleString("en-IN")} overdue`);
    } else {
      reasons.push(`₹${input.membershipValue.toLocaleString("en-IN")} renewal at risk`);
    }
  }

  // Attendance trend (0–20) — low attendance = higher churn risk
  if (input.attendanceLast30Days === 0) {
    score += 20;
    reasons.push("No attendance in the last 30 days");
  } else if (input.attendanceLast30Days <= 4) {
    score += 12;
    reasons.push(`Low attendance (${input.attendanceLast30Days} visits / 30 days)`);
  } else if (input.attendanceLast30Days >= 12) {
    score -= 5;
    reasons.push("Strong attendance — lower churn risk");
  }

  // Payment history (0–15)
  if (input.daysSinceLastPayment !== null && input.daysSinceLastPayment > 45) {
    score += 15;
    reasons.push(`No payment in ${input.daysSinceLastPayment} days`);
  } else if (input.paymentsLast90Days === 0) {
    score += 10;
    reasons.push("No payments recorded in the last 90 days");
  }

  // Reminder engagement (0–10) — fewer recent reminders = higher priority to contact
  if (input.remindersLast30Days === 0 && input.daysToExpiry <= 14) {
    score += 10;
    reasons.push("No reminder sent in the last 30 days");
  } else if (input.remindersLast30Days >= 3) {
    score -= 8;
    reasons.push("Multiple reminders already sent — lower response likelihood");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let priority: OpportunityScoreResult["priority"] = "LOW";
  if (score >= PRIORITY_THRESHOLDS.HIGH) priority = "HIGH";
  else if (score >= PRIORITY_THRESHOLDS.MEDIUM) priority = "MEDIUM";

  if (reasons.length === 0) {
    reasons.push("Routine renewal follow-up");
  }

  const predictions = computeMemberPredictions(input, calibration);

  return {
    score,
    priority,
    amountAtRisk,
    reasons,
    readinessScore: predictions.readinessScore,
    payProbability: predictions.readinessScore,
    churnRisk: predictions.churnRisk,
    predictionLabel: predictions.predictionLabel,
    outcomeSummary: predictions.outcomeSummary,
    readinessModelVersion: calibration.modelVersion,
    inferenceSource: "RULES",
    llmAssessment: null,
  };
}
