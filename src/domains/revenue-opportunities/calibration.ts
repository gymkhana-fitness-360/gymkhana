import { prisma } from "@/lib/prisma";
import { upsertGymFact } from "@/domains/intelligence/gym-facts";
import type { MemberOpportunityInput } from "./types";
import type { PredictionLabel } from "./types";

export const READINESS_MODEL_VERSION = "readiness-v1-outcomes";

export type GymReadinessCalibration = {
  modelVersion: string;
  sampleSize: number;
  recoveryRate: number;
  paymentWithin7dRate: number;
  likelyThreshold: number;
  unlikelyThreshold: number;
  calibratedAt: string;
};

export const DEFAULT_CALIBRATION: GymReadinessCalibration = {
  modelVersion: READINESS_MODEL_VERSION,
  sampleSize: 0,
  recoveryRate: 0.5,
  paymentWithin7dRate: 0.5,
  likelyThreshold: 62,
  unlikelyThreshold: 38,
  calibratedAt: new Date(0).toISOString(),
};

const CALIBRATION_FACT_KEY = "readiness.calibration_v1";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Calibrate cohort thresholds from closed opportunities + payments within 7d. */
export async function calibrateGymReadiness(
  gymId: string,
): Promise<GymReadinessCalibration> {
  const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

  const closed = await prisma.opportunity.findMany({
    where: {
      gymId,
      status: { in: ["RECOVERED", "LOST"] },
      updatedAt: { gte: since },
    },
    select: {
      id: true,
      memberId: true,
      status: true,
      createdAt: true,
      payProbability: true,
    },
    take: 400,
  });

  if (closed.length < 5) {
    return { ...DEFAULT_CALIBRATION, calibratedAt: new Date().toISOString() };
  }

  let recovered = 0;
  let lost = 0;
  let paidWithin7d = 0;
  let recoveredReadinessSum = 0;
  let lostReadinessSum = 0;

  for (const opp of closed) {
    if (opp.status === "LOST") {
      lost++;
      lostReadinessSum += opp.payProbability;
      continue;
    }
    recovered++;
    recoveredReadinessSum += opp.payProbability;

    const payment = await prisma.payment.findFirst({
      where: {
        gymId,
        memberId: opp.memberId,
        status: "COMPLETED",
        receivedAt: {
          gte: opp.createdAt,
          lte: addDays(opp.createdAt, 7),
        },
      },
      select: { id: true },
    });
    if (payment) paidWithin7d++;
  }

  const sampleSize = recovered + lost;
  const recoveryRate = recovered / sampleSize;
  const paymentWithin7dRate = recovered > 0 ? paidWithin7d / recovered : 0.5;

  const avgRecoveredReadiness = recovered > 0 ? recoveredReadinessSum / recovered : 55;
  const avgLostReadiness = lost > 0 ? lostReadinessSum / lost : 45;

  // Stricter labels when gym rarely recovers; loosen when recovery is strong.
  const likelyThreshold = Math.round(
    Math.max(55, Math.min(72, 64 - recoveryRate * 8 + avgRecoveredReadiness * 0.05)),
  );
  const unlikelyThreshold = Math.round(
    Math.max(28, Math.min(48, 42 - recoveryRate * 6 + avgLostReadiness * 0.03)),
  );

  const calibration: GymReadinessCalibration = {
    modelVersion: READINESS_MODEL_VERSION,
    sampleSize,
    recoveryRate: Math.round(recoveryRate * 1000) / 1000,
    paymentWithin7dRate: Math.round(paymentWithin7dRate * 1000) / 1000,
    likelyThreshold,
    unlikelyThreshold,
    calibratedAt: new Date().toISOString(),
  };

  await upsertGymFact(gymId, CALIBRATION_FACT_KEY, {
    factType: "METRIC",
    value: calibration,
    source: "outcome_calibration",
  });

  return calibration;
}

export async function loadGymReadinessCalibration(
  gymId: string,
): Promise<GymReadinessCalibration> {
  const row = await prisma.gymFact.findUnique({
    where: { gymId_factKey: { gymId, factKey: CALIBRATION_FACT_KEY } },
  });
  if (!row?.value || typeof row.value !== "object") {
    return DEFAULT_CALIBRATION;
  }
  const v = row.value as Partial<GymReadinessCalibration>;
  return {
    modelVersion: v.modelVersion ?? READINESS_MODEL_VERSION,
    sampleSize: v.sampleSize ?? 0,
    recoveryRate: v.recoveryRate ?? 0.5,
    paymentWithin7dRate: v.paymentWithin7dRate ?? 0.5,
    likelyThreshold: v.likelyThreshold ?? 62,
    unlikelyThreshold: v.unlikelyThreshold ?? 38,
    calibratedAt: v.calibratedAt ?? new Date(0).toISOString(),
  };
}

export function featureSnapshotFromInput(
  input: MemberOpportunityInput,
): Record<string, number | null> {
  return {
    daysToExpiry: input.daysToExpiry,
    overdueAmount: input.overdueAmount,
    attendanceLast30Days: input.attendanceLast30Days,
    paymentsLast90Days: input.paymentsLast90Days,
    remindersLast30Days: input.remindersLast30Days,
    daysSinceLastPayment: input.daysSinceLastPayment,
    membershipValue: input.membershipValue,
  };
}

/** Blend base readiness with gym recovery prior (no fake "probability" claims). */
export function applyReadinessCalibration(
  baseReadiness: number,
  baseChurn: number,
  calibration: GymReadinessCalibration,
): { readinessScore: number; churnRisk: number; predictionLabel: PredictionLabel } {
  const priorBoost = Math.round((calibration.recoveryRate - 0.5) * 12);
  const readinessScore = Math.max(
    0,
    Math.min(100, Math.round(baseReadiness * 0.85 + priorBoost + 8)),
  );
  const churnRisk = Math.max(0, Math.min(100, baseChurn));

  let predictionLabel: PredictionLabel = "AT_RISK";
  if (
    readinessScore >= calibration.likelyThreshold &&
    churnRisk < 55
  ) {
    predictionLabel = "LIKELY_TO_PAY";
  } else if (
    readinessScore < calibration.unlikelyThreshold ||
    churnRisk >= 72
  ) {
    predictionLabel = "UNLIKELY";
  }

  return { readinessScore, churnRisk, predictionLabel };
}
