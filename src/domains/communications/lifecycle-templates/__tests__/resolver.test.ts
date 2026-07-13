import { describe, expect, it } from "@jest/globals";
import { DEFAULT_LIFECYCLE_TEMPLATE_BODIES } from "../defaults";
import {
  buildLifecycleTemplateData,
  formatFriendlyPlanName,
  pickLifecycleTemplateKey,
  renderLifecycleTemplate,
} from "../resolver";

describe("lifecycle templates", () => {
  it("cleans internal plan names for members", () => {
    expect(formatFriendlyPlanName("Monthly (Default)")).toBe("Monthly");
    expect(formatFriendlyPlanName("Quarterly (PT)")).toBe("Quarterly");
  });

  it("replaces placeholders in template body", () => {
    const body = "Hi {{name}}, your {{plan}} ends {{expiryDate}} ({{n}} {{daysWord}} left).";
    const rendered = renderLifecycleTemplate(body, {
      name: "Priya",
      plan: "Monthly",
      expiryDate: "15 Jul 2026",
      daysLeft: 2,
      n: 2,
      daysWord: "days",
    });
    expect(rendered).toContain("Hi Priya");
    expect(rendered).toContain("Monthly");
    expect(rendered).toContain("2 days left");
  });

  it("picks template key from days left", () => {
    expect(pickLifecycleTemplateKey(5)).toBe("expiring_soon");
    expect(pickLifecycleTemplateKey(2)).toBe("before_2_days");
    expect(pickLifecycleTemplateKey(0)).toBe("expiry_day");
    expect(pickLifecycleTemplateKey(-7)).toBe("after_7_days");
  });

  it("ships default bodies for all keys", () => {
    const body = DEFAULT_LIFECYCLE_TEMPLATE_BODIES.before_2_days;
    expect(body).toContain("{{name}}");
    expect(body.length).toBeGreaterThan(20);
  });

  it("builds template data with friendly plan", () => {
    const data = buildLifecycleTemplateData({
      name: "Amit",
      planName: "Annual (Default)",
      expiryDate: "1 Aug 2026",
      daysLeft: -1,
    });
    expect(data.plan).toBe("Annual");
    expect(data.daysWord).toBe("day");
  });
});
