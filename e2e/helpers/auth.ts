import type { Page } from "@playwright/test";

export const E2E_CONTACT = process.env.E2E_CONTACT ?? "9831947879";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "Gympass@123!";

/**
 * Signs in via /login and waits until the dashboard shell is shown.
 * Requires a running app + seeded user (`npm run db:seed-e2e-user`).
 */
export async function loginAsDashboardUser(page: Page) {
  await page.goto("/login", { waitUntil: "networkidle" });
  const form = page.locator("form").first();
  await form.waitFor({ state: "visible" });
  await page.locator("#contactNumber").fill(E2E_CONTACT);
  await page.locator("#password").fill(E2E_PASSWORD);
  await form.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL(/\/dashboard/, {
    timeout: 45_000,
    waitUntil: "domcontentloaded",
  });
}
