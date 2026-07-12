export interface ChallengeDTO {
  id: string;
  gymId: string;
  name: string;
  startsOn: Date;
  endsOn: Date;
  isActive: boolean;
}

export interface WorkoutDTO {
  id: string;
  gymId: string;
  memberId: string;
  performedOn: Date;
  notes: string | null;
}

export interface LeaderboardEntryDTO {
  memberId: string;
  memberName: string;
  score: number;
  rank: number;
}
