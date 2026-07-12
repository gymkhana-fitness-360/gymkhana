import {
  ApiAuthClass,
  bypassesSessionMiddleware,
  classifyRoute,
} from "@/lib/security/api-auth-classes";

describe("api-auth-classes", () => {
  it("classifies cron routes as CRON_BEARER", () => {
    expect(classifyRoute("/api/cron/unified")).toBe(ApiAuthClass.CRON_BEARER);
    expect(classifyRoute("/api/cron/overdue-cleanup")).toBe(ApiAuthClass.CRON_BEARER);
    expect(bypassesSessionMiddleware(ApiAuthClass.CRON_BEARER)).toBe(true);
  });

  it("classifies webhook routes as WEBHOOK_SIGNED", () => {
    expect(classifyRoute("/api/webhooks/razorpay")).toBe(ApiAuthClass.WEBHOOK_SIGNED);
    expect(bypassesSessionMiddleware(ApiAuthClass.WEBHOOK_SIGNED)).toBe(true);
  });

  it("classifies session APIs as SESSION", () => {
    expect(classifyRoute("/api/members")).toBe(ApiAuthClass.SESSION);
    expect(classifyRoute("/api/payments")).toBe(ApiAuthClass.SESSION);
    expect(bypassesSessionMiddleware(ApiAuthClass.SESSION)).toBe(false);
  });

  it("classifies health and auth as PUBLIC", () => {
    expect(classifyRoute("/api/health")).toBe(ApiAuthClass.PUBLIC);
    expect(classifyRoute("/api/auth/signin")).toBe(ApiAuthClass.PUBLIC);
    expect(bypassesSessionMiddleware(ApiAuthClass.PUBLIC)).toBe(true);
  });

  it("classifies oauth and agent routes as OAUTH_BEARER", () => {
    expect(classifyRoute("/api/oauth/token")).toBe(ApiAuthClass.OAUTH_BEARER);
    expect(classifyRoute("/api/agent/v1/tools/overdue")).toBe(ApiAuthClass.OAUTH_BEARER);
    expect(classifyRoute("/api/mcp")).toBe(ApiAuthClass.OAUTH_BEARER);
    expect(bypassesSessionMiddleware(ApiAuthClass.OAUTH_BEARER)).toBe(true);
  });

  it("classifies commercial pages on product host as SESSION (middleware redirects to marketing)", () => {
    expect(classifyRoute("/developers")).toBe(ApiAuthClass.SESSION);
    expect(classifyRoute("/playground")).toBe(ApiAuthClass.SESSION);
    expect(classifyRoute("/opensource")).toBe(ApiAuthClass.SESSION);
  });
});
