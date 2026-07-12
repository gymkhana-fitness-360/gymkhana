import { validateQuickEntryMemberName } from "../quick-entry-validation";

describe("validateQuickEntryMemberName", () => {
  it("accepts Devanagari script", () => {
    expect(validateQuickEntryMemberName("राज कुमार").ok).toBe(true);
  });

  it("accepts Tamil script", () => {
    expect(validateQuickEntryMemberName("அருண்").ok).toBe(true);
  });

  it("rejects digits-only", () => {
    expect(validateQuickEntryMemberName("12345").ok).toBe(false);
  });

  it("rejects no letters at all", () => {
    expect(validateQuickEntryMemberName("@@@").ok).toBe(false);
  });
});
