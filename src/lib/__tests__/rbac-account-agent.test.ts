import {
  accountRoleHasPermission,
  resolveAccountPermissions,
} from "@/lib/rbac/account-roles";
import {
  agentHasScope,
  normalizeRequestedScopes,
  parseAgentScopes,
} from "@/lib/rbac/agent-scopes";

describe("account RBAC", () => {
  it("OWNER has edit permissions", () => {
    expect(
      accountRoleHasPermission(
        { accountMemberRole: "OWNER", userRole: "SUB_ADMIN" },
        "canEditPayments",
      ),
    ).toBe(true);
  });

  it("STAFF membership overrides legacy ADMIN user role", () => {
    const perms = resolveAccountPermissions({
      accountMemberRole: "STAFF",
      userRole: "ADMIN",
    });
    expect(perms.has("canEditPayments")).toBe(false);
    expect(perms.has("canViewMembers")).toBe(true);
  });

  it("falls back to legacy ADMIN when no membership", () => {
    expect(
      accountRoleHasPermission(
        { accountMemberRole: null, userRole: "ADMIN" },
        "canEditMembers",
      ),
    ).toBe(true);
  });
});

describe("agent scopes", () => {
  it("parses known scopes only", () => {
    expect(parseAgentScopes(["read:overdue", "nope"])).toEqual(["read:overdue"]);
  });

  it("enforces scope membership", () => {
    expect(agentHasScope(["read:members"], "read:overdue")).toBe(false);
    expect(agentHasScope(["read:overdue"], "read:overdue")).toBe(true);
  });

  it("normalizes requested scopes to allowed subset", () => {
    expect(
      normalizeRequestedScopes(["read:members", "write:reminders"], [
        "read:members",
        "read:overdue",
      ]),
    ).toEqual(["read:members"]);
  });
});
