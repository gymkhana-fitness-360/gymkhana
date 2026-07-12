/**
 * Membership lifecycle state machine (TLA+ verified)
 * Valid transitions only - invalid transitions are rejected.
 */

export {
  validateStateTransition,
} from "@/lib/state-machine";
