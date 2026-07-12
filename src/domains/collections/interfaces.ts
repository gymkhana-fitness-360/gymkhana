import type { CollectionSummaryDTO, OverdueDTO } from "./types";

export interface IOverdueService {
  detectAndSync(gymId?: string): Promise<OverdueDTO[]>;
  resolveForMember(memberId: string): Promise<void>;
}

export interface ICollectionQueries {
  listOverdue(gymId: string): Promise<OverdueDTO[]>;
  getSummary(gymId: string): Promise<CollectionSummaryDTO>;
}
