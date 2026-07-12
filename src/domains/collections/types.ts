export interface OverdueDTO {
  memberId: string;
  gymId: string;
  memberName: string;
  phone: string;
  amountDue: number;
  sinceDate: Date;
  daysPastDue: number;
}

export interface CollectionSummaryDTO {
  gymId: string;
  asOf: Date;
  totalOutstanding: number;
  memberCount: number;
  bucket0to7: number;
  bucket8to30: number;
  bucket30plus: number;
}
