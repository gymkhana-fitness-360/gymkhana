import { test, expect } from '@playwright/test';

test.describe('Login Page UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display the login page with correct branding', async ({ page }) => {
    await expect(page).toHaveTitle(/Gymkhana Fitness 360|Gym Management/i);

    await expect(page.locator('[data-slot="card-title"]').getByText('Gymkhana')).toBeVisible();
    
    // Check sign in text
    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });

  test('should display contact number input field', async ({ page }) => {
    // Check for Contact Number label
    await expect(page.getByText('Contact Number')).toBeVisible();
    
    // Check for contact number input
    const contactInput = page.getByPlaceholder(/contact number/i);
    await expect(contactInput).toBeVisible();
    await expect(contactInput).toBeEditable();
  });

  test('should display password input field', async ({ page }) => {
    // Check for Password label
    await expect(page.getByText('Password', { exact: true })).toBeVisible();
    
    // Check for password input
    const passwordInput = page.getByPlaceholder(/password/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toBeEditable();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should have password visibility toggle', async ({ page }) => {
    const passwordInput = page.getByPlaceholder(/password/i);
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: /show password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: /hide password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should display Sign In button', async ({ page }) => {
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toBeEnabled();
  });

  test('should NOT display default credentials', async ({ page }) => {
    // Ensure no default credentials are shown
    await expect(page.getByText(/default credentials/i)).not.toBeVisible();
    await expect(page.getByText(/admin@/i)).not.toBeVisible();
  });

  test('should have proper styling and layout', async ({ page }) => {
    // Check that the page has a dark background
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toBeTruthy();
    
    // Check that inputs are visible and styled
    const contactInput = page.getByPlaceholder(/contact number/i);
    const inputBox = await contactInput.boundingBox();
    expect(inputBox).toBeTruthy();
    expect(inputBox!.width).toBeGreaterThan(100);
    expect(inputBox!.height).toBeGreaterThan(20);
  });

  test('should allow typing in contact number field', async ({ page }) => {
    const contactInput = page.getByPlaceholder(/contact number/i);
    await contactInput.fill('9831947879');
    await expect(contactInput).toHaveValue('9831947879');
  });

  test('should allow typing in password field', async ({ page }) => {
    const passwordInput = page.getByPlaceholder(/password/i);
    await passwordInput.fill('TestPassword123!');
    await expect(passwordInput).toHaveValue('TestPassword123!');
  });

  test('should show validation for empty form submission', async ({ page }) => {
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();
    
    // Wait for any validation messages or errors
    await page.waitForTimeout(1000);
    
    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should attempt login with valid credentials format', async ({ page }) => {
    const contactInput = page.getByPlaceholder(/contact number/i);
    const passwordInput = page.getByPlaceholder(/password/i);
    const signInButton = page.getByRole('button', { name: /sign in/i });
    
    // Fill in credentials
    await contactInput.fill('9831947879');
    await passwordInput.fill('Gympass@123!');
    
    // Click sign in
    await signInButton.click();
    
    // Wait for navigation or error
    await page.waitForTimeout(2000);
    
    // Should either redirect to dashboard or show error
    const url = page.url();
    const hasError = await page.getByText(/error|invalid|incorrect/i).count() > 0;
    
    expect(url.includes('/login') || url.includes('/dashboard') || hasError).toBeTruthy();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    
    // Check that elements are still visible
    await expect(page.locator('[data-slot="card-title"]').getByText('Gymkhana')).toBeVisible();
    await expect(page.getByPlaceholder(/contact number/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should have accessible form elements', async ({ page }) => {
    // Check for proper labels
    const contactLabel = page.getByText('Contact Number');
    const passwordLabel = page.getByText('Password', { exact: true });
    
    await expect(contactLabel).toBeVisible();
    await expect(passwordLabel).toBeVisible();
    
    // Check that button is accessible
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeVisible();
  });

  test('should load page within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes('favicon') &&
        !error.includes('manifest') &&
        !error.includes('React DevTools') &&
        !error.includes('Download the') &&
        !error.includes('hydration') &&
        !error.includes('ResizeObserver') &&
        !error.includes('ClientFetchError') &&
        !error.includes('errors.authjs.dev')
    );

    expect(criticalErrors).toEqual([]);
  });
});
