import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  globalTimeout: process.env.CI ? 600_000 : undefined,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    // Prefer explicit BASE_URL (e.g. Vercel). Default matches webServer so local `npm run test:e2e` works.
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: process.env.BASE_URL ? undefined : {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      // Local dev only — production `next start` (CI) must not enable demo auto-link.
      ...(process.env.CI ? {} : { ALLOW_DEMO_ACCOUNT_AUTO_LINK: "true" }),
    },
  },
});
