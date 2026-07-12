import {
  applyReadinessCalibration,
  type GymReadinessCalibration,
} from "./calibration";
import type { MemberOpportunityInput, PredictionLabel } from "./types";

export type MemberPredictionResult = {
  /** 0–100 readiness to recover revenue (not a calibrated probability). */
  readinessScore: number;
  churnRisk: number;
  predictionLabel: PredictionLabel;
  outcomeSummary: string;
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** Base readiness signal from features (before gym outcome calibration). */
export function computeBaseReadinessSignals(
  input: MemberOpportunityInput,
): { baseReadiness: number; churnRisk: number } {
  let readiness = 52;
  let churn = 28;

  if (input.attendanceLast30Days >= 10) readiness += 22;
  else if (input.attendanceLast30Days >= 5) readiness += 12;
  else if (input.attendanceLast30Days === 0) readiness -= 28;

  if (input.daysSinceLastPayment !== null && input.daysSinceLastPayment <= 21) {
    readiness += 14;
  } else if (
    input.daysSinceLastPayment !== null &&
    input.daysSinceLastPayment > 60
  ) {
    readiness -= 18;
  }

  if (input.paymentsLast90Days >= 2) readiness += 10;
  else if (input.paymentsLast90Days === 0) readiness -= 12;

  if (input.daysToExpiry >= 0 && input.daysToExpiry <= 7) readiness += 8;
  if (input.daysToExpiry < 0) {
    const overdueDays = Math.abs(input.daysToExpiry);
    readiness -= Math.min(30, 8 + overdueDays);
    churn += Math.min(35, 12 + overdueDays);
  } else if (input.daysToExpiry <= 14) {
    churn += 8;
  }

  if (input.remindersLast30Days >= 3) readiness -= 22;
  else if (
    input.remindersLast30Days === 0 &&
    input.daysToExpiry <= 14
  ) {
    readiness += 6;
  }

  if (input.attendanceLast30Days === 0) churn += 38;
  else if (input.attendanceLast30Days <= 3) churn += 22;
  else if (input.attendanceLast30Days >= 12) churn -= 18;

  if (input.paymentsLast90Days === 0) churn += 16;
  if (input.daysSinceLastPayment !== null && input.daysSinceLastPayment > 90) {
    churn += 12;
  }
  if (input.remindersLast30Days >= 3) churn += 10;

  return {
    baseReadiness: clamp(readiness),
    churnRisk: clamp(churn),
  };
}

export function formatOutcomeSummary(
  predictionLabel: PredictionLabel,
  readinessScore: number,
  churnRisk: number,
  calibration?: Pick<GymReadinessCalibration, "sampleSize" | "recoveryRate">,
): string {
  const calibrated =
    calibration && calibration.sampleSize >= 5
      ? ` · gym recovery ${Math.round(calibration.recoveryRate * 100)}% (n=${calibration.sampleSize})`
      : "";

  if (predictionLabel === "LIKELY_TO_PAY") {
    return `High recovery readiness (${readinessScore}/100)${calibrated}`;
  }
  if (predictionLabel === "UNLIKELY") {
    return `Low readiness (${readinessScore}/100) · lapse risk ${churnRisk}/100${calibrated}`;
  }
  return `Mixed readiness ${readinessScore}/100 · lapse risk ${churnRisk}/100${calibrated}`;
}

export function computeMemberPredictions(
  input: MemberOpportunityInput,
  calibration: GymReadinessCalibration,
): MemberPredictionResult {
  const { baseReadiness, churnRisk } = computeBaseReadinessSignals(input);
  const applied = applyReadinessCalibration(
    baseReadiness,
    churnRisk,
    calibration,
  );

  return {
    readinessScore: applied.readinessScore,
    churnRisk: applied.churnRisk,
    predictionLabel: applied.predictionLabel,
    outcomeSummary: formatOutcomeSummary(
      applied.predictionLabel,
      applied.readinessScore,
      applied.churnRisk,
      calibration,
    ),
  };
}
