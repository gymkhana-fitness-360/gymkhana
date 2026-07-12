/** Workforce agent profiles (OS-4) — tool allowlists + intent, not separate runtimes. */

export type AgentProfileId = "collections" | "retention" | "sales";

export type AgentProfile = {
  id: AgentProfileId;
  name: string;
  description: string;
  goalHint: string;
  tools: string[];
};

export const AGENT_PROFILES: AgentProfile[] = [
  {
    id: "collections",
    name: "Collections",
    description: "Recover overdue and at-risk membership revenue.",
    goalHint: "Recover ₹ from open opportunities and overdue members.",
    tools: [
      "getChasePlan",
      "listChaseCandidates",
      "getOverdues",
      "sendReminder",
      "getRenewals",
      "listGymFacts",
    ],
  },
  {
    id: "retention",
    name: "Retention",
    description: "Fill quiet hours and re-engage slipping members.",
    goalHint: "Improve attendance and renewal timing.",
    tools: [
      "getAttendanceHeatmap",
      "getOperatingHoursFact",
      "createOffer",
      "draftEngagement",
      "getMemberInsights",
      "listGymFacts",
    ],
  },
  {
    id: "sales",
    name: "Sales",
    description: "Trials, leads, and PT revenue.",
    goalHint: "Convert trials and grow PT sales.",
    tools: [
      "listActiveTrials",
      "convertTrialToMember",
      "listLeads",
      "convertLeadToTrial",
      "getTrainerLeaderboard",
      "createPtRevenueGoal",
      "createCampaign",
      "listGymFacts",
    ],
  },
];

export function getAgentProfile(id: AgentProfileId): AgentProfile | undefined {
  return AGENT_PROFILES.find((p) => p.id === id);
}
