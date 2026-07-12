export type OpportunityPriority = "LOW" | "MEDIUM" | "HIGH";

export type OpportunityStatus = "OPEN" | "CONTACTED" | "RECOVERED" | "LOST";

export type PredictionLabel = "LIKELY_TO_PAY" | "AT_RISK" | "UNLIKELY";

export type InferenceSource = "RULES" | "LLM" | "HYBRID";

export type OpportunityScoreResult = {
  score: number;
  priority: OpportunityPriority;
  amountAtRisk: number;
  reasons: string[];
  /** 0–100 recovery readiness (stored in DB column payProbability). */
  readinessScore: number;
  payProbability: number;
  churnRisk: number;
  predictionLabel: PredictionLabel;
  outcomeSummary: string;
  readinessModelVersion: string;
  inferenceSource: InferenceSource;
  llmAssessment?: Record<string, unknown> | null;
};

export type MemberOpportunityInput = {
  memberId: string;
  memberName: string;
  /** Active membership monthly/plan amount */
  membershipValue: number;
  /** Days until expiry; negative means overdue */
  daysToExpiry: number;
  /** Sum of overdue tracking or unpaid balance */
  overdueAmount: number;
  /** Attendance check-ins in last 30 days */
  attendanceLast30Days: number;
  /** Completed payments in last 90 days */
  paymentsLast90Days: number;
  /** Reminder logs sent in last 30 days */
  remindersLast30Days: number;
  /** Days since last payment */
  daysSinceLastPayment: number | null;
};

export type OpportunityRecord = {
  id: string;
  gymId: string;
  memberId: string;
  score: number;
  amountAtRisk: number;
  priority: OpportunityPriority;
  reasons: string[];
  readinessScore: number;
  payProbability: number;
  churnRisk: number;
  predictionLabel: PredictionLabel;
  outcomeSummary: string;
  readinessModelVersion: string | null;
  inferenceSource: InferenceSource;
  llmRationale?: string | null;
  llmRecommendedAction?: string | null;
  llmError?: string | null;
  status: OpportunityStatus;
  memberName?: string;
  memberPhone?: string;
  createdAt: Date;
  updatedAt: Date;
};
