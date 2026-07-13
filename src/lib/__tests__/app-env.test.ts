import { isDevSelfHealEnabled, isAgentApiEnabled } from "@/lib/app-env";

describe("app-env feature flags", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("isDevSelfHealEnabled respects ENABLE_DEV_SELF_HEAL=true", () => {
    process.env.ENABLE_DEV_SELF_HEAL = "true";
    expect(isDevSelfHealEnabled()).toBe(true);
  });

  it("isDevSelfHealEnabled is false when flag unset in test env", () => {
    delete process.env.ENABLE_DEV_SELF_HEAL;
    expect(isDevSelfHealEnabled()).toBe(process.env.NODE_ENV === "development");
  });

  it("isAgentApiEnabled defaults off", () => {
    delete process.env.ENABLE_AGENT_API;
    expect(isAgentApiEnabled()).toBe(false);
  });

  it("isAgentApiEnabled turns on with env=true", () => {
    process.env.ENABLE_AGENT_API = "true";
    expect(isAgentApiEnabled()).toBe(true);
  });
});
