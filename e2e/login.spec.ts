import { test, expect } from "@playwright/test";

test.describe("Login page smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
  });

  test("shows Fitness360 sign-in shell", async ({ page }) => {
    await expect(page).toHaveTitle(/Fitness360/i);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByText(/sign in to your fitness360 account/i)).toBeVisible();
  });

  test("shows email or phone and password fields", async ({ page }) => {
    await expect(page.getByLabel(/email or phone/i)).toBeVisible();
    await expect(page.locator("#contactNumber")).toBeEditable();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.locator("#password")).toHaveAttribute("type", "password");
  });

  test("shows sign in and forgot password actions", async ({ page }) => {
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
  });

  test("does not expose default credentials", async ({ page }) => {
    await expect(page.getByText(/default credentials/i)).not.toBeVisible();
    await expect(page.getByText(/Gympass@123!/i)).not.toBeVisible();
  });

  test("stays on login when submitting empty required fields", async ({ page }) => {
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
