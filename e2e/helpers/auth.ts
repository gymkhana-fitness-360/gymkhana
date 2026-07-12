import type { Page } from "@playwright/test";

export const E2E_CONTACT = process.env.E2E_CONTACT ?? "9831947879";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "Gympass@123!";

/**
 * Signs in via /login and waits until the dashboard shell is shown.
 * Requires a running app + valid user in the target environment.
 */
export async function loginAsDashboardUser(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder(/contact number/i).fill(E2E_CONTACT);
  await page.getByPlaceholder(/password/i).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
}
