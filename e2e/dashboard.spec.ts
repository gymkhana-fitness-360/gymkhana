import { test, expect } from "@playwright/test";
import { loginAsDashboardUser } from "./helpers/auth";

test.describe("Dashboard smoke", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsDashboardUser(page);
  });

  test("lands on dashboard after login", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /^dashboard$/i })).toBeVisible();
  });

  test("shows Fitness360 branding and admin header", async ({ page }) => {
    await expect(page.getByText(/fitness360/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /welcome,/i })).toBeVisible();
    await expect(page.getByText("Administrator", { exact: true })).toBeVisible();
  });

  test("shows core navigation links", async ({ page }) => {
    await expect(page.getByRole("link", { name: /^dashboard$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^members$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^payments$/i })).toBeVisible();
  });

  test("navigates to members and payments", async ({ page }) => {
    await page.getByRole("link", { name: /^members$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/members/);

    await page.getByRole("link", { name: /^payments$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/payments/);
  });
});
