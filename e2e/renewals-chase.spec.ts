import { test, expect } from "@playwright/test";
import { loginAsDashboardUser } from "./helpers/auth";

test.describe("Renewals chase", () => {
  test("shows chase panel and goal UI", async ({ page }) => {
    await loginAsDashboardUser(page);
    await page.goto("/dashboard/renewals", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(/who to chase today/i)).toBeVisible({
      timeout: 30_000,
    });

    await expect(
      page.getByRole("heading", { name: /renewals/i }).or(page.getByText(/renewals/i).first()),
    ).toBeVisible();

    const approvalOrChase = page.getByText(/approval queue|set goal|recover/i).first();
    await expect(approvalOrChase).toBeVisible({ timeout: 15_000 });
  });
});
