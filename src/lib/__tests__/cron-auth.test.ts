import { NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";

describe("verifyCronRequest", () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it("rejects when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    const req = new NextRequest("http://localhost/api/cron/unified", {
      headers: { authorization: "Bearer anything" },
    });
    expect(verifyCronRequest(req)).toBe(false);
  });

  it("rejects missing or invalid bearer token", () => {
    process.env.CRON_SECRET = "test-cron-secret";
    const noAuth = new NextRequest("http://localhost/api/cron/unified");
    expect(verifyCronRequest(noAuth)).toBe(false);

    const bad = new NextRequest("http://localhost/api/cron/unified", {
      headers: { authorization: "Bearer wrong" },
    });
    expect(verifyCronRequest(bad)).toBe(false);
  });

  it("accepts valid bearer token", () => {
    process.env.CRON_SECRET = "test-cron-secret";
    const req = new NextRequest("http://localhost/api/cron/unified", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    expect(verifyCronRequest(req)).toBe(true);
  });
});
