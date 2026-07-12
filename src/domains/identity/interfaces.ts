import type { SessionContextDTO, UserDTO } from "./types";

/** Resolves the current principal for a request (e.g. NextAuth session). */
export interface ICurrentUserResolver {
  getCurrentUser(): Promise<UserDTO | null>;
  getSessionContext(): Promise<SessionContextDTO | null>;
}
