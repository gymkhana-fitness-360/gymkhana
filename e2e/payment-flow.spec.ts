import { test, expect } from "@playwright/test";

/** GYM-P1-010: payment flow smoke (UI-only; requires auth env for full run). */
test.describe("Payment flow smoke", () => {
  test("payments page requires login", async ({ page }) => {
    await page.goto("/dashboard/payments");
    await expect(page).toHaveURL(/\/login/);
  });
});
