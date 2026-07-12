export interface AnalyticsSummaryDTO {
  gymId: string;
  periodStart: Date;
  periodEnd: Date;
  totalCollections: number;
  activeMembers: number;
  newMembers: number;
  churnedMembers: number;
}

export interface ChurnPredictionDTO {
  memberId: string;
  riskScore: number;
  reasons: string[];
}
