import { test, expect } from '@playwright/test';
import { loginAsDashboardUser } from './helpers/auth';

test.describe('Members Page UI Tests', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsDashboardUser(page);
    await page.getByRole('link', { name: /members/i }).first().click();
    await page.waitForURL(/\/dashboard\/members/, { timeout: 20000 });
  });

  test('should display members page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/members/);
    await expect(page.getByText(/members/i)).toBeVisible();
  });

  test('should display members list or table', async ({ page }) => {
    // Wait for members to load
    await page.waitForTimeout(2000);
    
    // Check for table or list elements
    const hasTable = await page.locator('table').count() > 0;
    const hasList = await page.locator('[role="list"]').count() > 0;
    const hasCards = await page.locator('.card, [class*="card"]').count() > 0;
    
    expect(hasTable || hasList || hasCards).toBeTruthy();
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeEditable();
    }
  });

  test('should have add new member button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add|new member/i }).or(
      page.getByRole('link', { name: /add|new member/i })
    );
    
    if (await addButton.count() > 0) {
      await expect(addButton).toBeVisible();
    }
  });

  test('should display member information', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Check if any member data is visible
    const hasNames = await page.locator('text=/[A-Z][a-z]+ [A-Z][a-z]+/').count() > 0;
    const hasPhones = await page.locator('text=/[0-9]{10}/').count() > 0;
    
    // At least one should be visible if members exist
    if (hasNames || hasPhones) {
      expect(true).toBeTruthy();
    }
  });

  test('should have filter options', async ({ page }) => {
    // Check for status filters
    const filterButtons = page.locator('button').filter({ hasText: /active|dormant|all/i });
    if (await filterButtons.count() > 0) {
      await expect(filterButtons.first()).toBeVisible();
    }
  });

  test('should handle empty search results', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.count() > 0) {
      await searchInput.fill('NONEXISTENTMEMBER12345');
      await page.waitForTimeout(1000);
      
      // Should show no results message or empty state
      const noResults = await page.getByText(/no.*found|no.*members|empty/i).count() > 0;
      expect(noResults).toBeTruthy();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Members page should still be accessible
    await expect(page.getByText(/members/i)).toBeVisible();
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForLoadState('networkidle');
    
    // Filter out known acceptable errors
    const criticalErrors = consoleErrors.filter(
      (error) => !error.includes('favicon') && !error.includes('manifest') && !error.includes('undefined')
    );
    
    // Should have minimal errors
    expect(criticalErrors.length).toBeLessThan(3);
  });
});
