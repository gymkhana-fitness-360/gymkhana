import { describe, it, expect } from "@jest/globals";
import {
  DEFAULT_DEMO_ACCOUNT_ID,
  DEFAULT_DEMO_GYM_ID,
  GYM_COOKIE_NAME,
} from "@/lib/gym-constants";

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("gym-constants", () => {
  it("uses stable UUID-shaped demo ids", () => {
    expect(DEFAULT_DEMO_ACCOUNT_ID).toMatch(uuidRe);
    expect(DEFAULT_DEMO_GYM_ID).toMatch(uuidRe);
    expect(DEFAULT_DEMO_ACCOUNT_ID).not.toBe(DEFAULT_DEMO_GYM_ID);
  });

  it("defines cookie name", () => {
    expect(GYM_COOKIE_NAME.length).toBeGreaterThan(0);
  });
});
