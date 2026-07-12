import { GymContextError } from "./gym-context";

/** GYM-M0-011: enforce gymId on domain adapter inputs */
export function requireGymId(gymId: string | null | undefined): asserts gymId is string {
  if (!gymId || typeof gymId !== "string") {
    throw new GymContextError(400, "Gym context required");
  }
}
