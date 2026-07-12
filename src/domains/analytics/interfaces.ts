import type { AnalyticsSummaryDTO, ChurnPredictionDTO } from "./types";

export interface IAnalyticsService {
  getSummary(gymId: string, from: Date, to: Date): Promise<AnalyticsSummaryDTO>;
  predictChurn(gymId: string): Promise<ChurnPredictionDTO[]>;
}
