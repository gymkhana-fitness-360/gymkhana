import type { AccountContextDTO, GymContextDTO } from "./types";

export interface ITenancyResolver {
  resolveGym(gymId: string): Promise<GymContextDTO | null>;
  requireGym(gymId: string): Promise<GymContextDTO>;
}

export interface IGymQueries {
  listGymsForAccount(accountId: string): Promise<GymContextDTO[]>;
  getGymById(gymId: string): Promise<GymContextDTO | null>;
}

export interface IAccountQueries {
  getAccountContext(accountId: string): Promise<AccountContextDTO | null>;
}
