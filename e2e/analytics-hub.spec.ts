import { test, expect } from "@playwright/test";
import { loginAsDashboardUser } from "./helpers/auth";

test.describe("Analytics Hub E2E", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsDashboardUser(page);
  });

  test("navigates to Analytics Hub from the shell", async ({ page }) => {
    const analyticsLink = page.getByRole("link", { name: /^analytics$/i }).first();
    await expect(analyticsLink).toBeVisible({ timeout: 10000 });
    await analyticsLink.click();
    await expect(page).toHaveURL(/\/dashboard\/analytics/);
    await expect(page.getByRole("heading", { name: /analytics hub/i })).toBeVisible();
    await expect(
      page.getByText("Configurable analytics and insights")
    ).toBeVisible();
  });

  test("shows configuration: date presets, metrics, and refresh", async ({
    page,
  }) => {
    await page.goto("/dashboard/analytics");
    await expect(page.getByText("Configuration").first()).toBeVisible();
    await expect(page.getByText("Date Range", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "This Month" })
    ).toBeVisible();
    await expect(page.getByText("Metrics", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /payments/i }).first()
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
  });

  test("loads analytics summary from API and renders KPI or error state", async ({
    page,
  }) => {
    const summaryPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/analytics/summary") && res.request().method() === "GET",
      { timeout: 30000 }
    );

    await page.goto("/dashboard/analytics");
    const res = await summaryPromise;

    if (!res.ok()) {
      await expect(
        page
          .getByText(/failed to load analytics/i)
          .or(page.getByPlaceholder(/contact number/i))
      ).toBeVisible({ timeout: 15000 });
      return;
    }

    await expect(
      page
        .getByText("Total Payments")
        .or(page.getByText(/showing data from/i))
        .or(page.getByText(/transactions/i))
    ).toBeVisible({ timeout: 20000 });
  });

  test("changing date preset refetches analytics", async ({ page }) => {
    const firstSummary = page.waitForResponse(
      (r) =>
        r.url().includes("/api/analytics/summary") &&
        r.request().method() === "GET",
      { timeout: 45000 }
    );

    await page.goto("/dashboard/analytics", { waitUntil: "domcontentloaded" });
    await firstSummary;

    const secondSummary = page.waitForResponse(
      (r) =>
        r.url().includes("/api/analytics/summary") &&
        r.request().method() === "GET",
      { timeout: 45000 }
    );

    await page.getByRole("button", { name: "Last Month" }).click();
    await secondSummary;

    await expect(page.getByRole("button", { name: "Last Month" })).toBeVisible();
  });

  test("deselecting all metrics shows guidance message", async ({ page }) => {
    await page.goto("/dashboard/analytics");
    await page.waitForResponse(
      (r) => r.url().includes("/api/analytics/summary"),
      { timeout: 30000 }
    );

    await page.getByRole("button", { name: /^payments$/i }).click();
    await page.getByRole("button", { name: /^members$/i }).click();
    await page.getByRole("button", { name: /^renewals$/i }).click();
    await page.getByRole("button", { name: /^attendance$/i }).click();

    await expect(
      page.getByText(/select at least one metric/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("refresh button stays enabled after load", async ({ page }) => {
    await page.goto("/dashboard/analytics");
    await page.waitForResponse(
      (r) => r.url().includes("/api/analytics/summary"),
      { timeout: 30000 }
    );

    const refresh = page.getByRole("button", { name: "Refresh" });
    await expect(refresh).toBeEnabled();
    await refresh.click();
    await page.waitForResponse(
      (r) => r.url().includes("/api/analytics/summary"),
      { timeout: 30000 }
    );
    await expect(refresh).toBeEnabled();
  });
});
