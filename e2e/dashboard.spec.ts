import { test, expect } from '@playwright/test';
import { loginAsDashboardUser } from './helpers/auth';

test.describe('Dashboard UI Tests', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsDashboardUser(page);
  });

  test('should display dashboard after successful login', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/dashboard|welcome/i)).toBeVisible();
  });

  test('should display navigation menu', async ({ page }) => {
    // Check for main navigation items
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /members/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /payments/i })).toBeVisible();
  });

  test('should display app branding in sidebar', async ({ page }) => {
    await expect(
      page.getByText(/Gymkhana|Gym Management/i).first()
    ).toBeVisible();
  });

  test('should display user information', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /welcome/i })
    ).toBeVisible();
    await expect(page.getByText('Administrator')).toBeVisible();
  });

  test('should have logout button', async ({ page }) => {
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    await expect(logoutButton).toBeVisible();
  });

  test('should display dashboard metrics', async ({ page }) => {
    // Check for common dashboard metrics
    const metricsVisible = await page.getByText(/total members|active|dormant|revenue/i).count();
    expect(metricsVisible).toBeGreaterThan(0);
  });

  test('should navigate to members page', async ({ page }) => {
    await page.getByRole('link', { name: /members/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/members/);
  });

  test('should navigate to payments page', async ({ page }) => {
    await page.getByRole('link', { name: /payments/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/payments/);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigation should still be accessible (possibly via hamburger menu)
    const menuButton = page.locator('button').filter({ hasText: /menu|☰/i });
    if (await menuButton.count() > 0) {
      await menuButton.click();
    }
    
    // Dashboard content should be visible
    await expect(page.getByText(/dashboard|welcome/i)).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    await logoutButton.click();
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
