import {
  isDevSelfHealEnabled,
  isPlaygroundEnabled,
  isDevelopersPortalEnabled,
  isAgentApiEnabled,
} from "@/lib/app-env";

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

  it("feature gates default off", () => {
    delete process.env.ENABLE_PLAYGROUND;
    delete process.env.ENABLE_DEVELOPERS_PORTAL;
    delete process.env.ENABLE_AGENT_API;
    expect(isPlaygroundEnabled()).toBe(false);
    expect(isDevelopersPortalEnabled()).toBe(false);
    expect(isAgentApiEnabled()).toBe(false);
  });

  it("feature gates turn on with env=true", () => {
    process.env.ENABLE_PLAYGROUND = "true";
    process.env.ENABLE_DEVELOPERS_PORTAL = "true";
    process.env.ENABLE_AGENT_API = "true";
    expect(isPlaygroundEnabled()).toBe(true);
    expect(isDevelopersPortalEnabled()).toBe(true);
    expect(isAgentApiEnabled()).toBe(true);
  });
});
