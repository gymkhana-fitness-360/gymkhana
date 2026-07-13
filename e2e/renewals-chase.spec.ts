import { test, expect } from "@playwright/test";
import { loginAsDashboardUser } from "./helpers/auth";

test.describe("Renewals chase", () => {
  test.describe.configure({ timeout: 60_000 });

  test("shows renewals page and chase panel", async ({ page }) => {
    await loginAsDashboardUser(page);
    await page.goto("/dashboard/renewals", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: /^renewals$/i })).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByText(/recovery readiness/i)).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /set goal/i }).or(page.getByText(/recovered/i)),
    ).toBeVisible({ timeout: 15_000 });
  });
});
