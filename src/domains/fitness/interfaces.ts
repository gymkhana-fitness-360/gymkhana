import type { ChallengeDTO, LeaderboardEntryDTO, WorkoutDTO } from "./types";

export interface IChallengeService {
  listChallenges(gymId: string): Promise<ChallengeDTO[]>;
  joinChallenge(gymId: string, challengeId: string, memberId: string): Promise<void>;
}

export interface IWorkoutService {
  logWorkout(
    input: Omit<WorkoutDTO, "id">
  ): Promise<WorkoutDTO>;
  leaderboard(gymId: string, challengeId: string): Promise<LeaderboardEntryDTO[]>;
}
