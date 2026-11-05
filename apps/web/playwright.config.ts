import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:3100';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    channel: process.env.PLAYWRIGHT_CHANNEL,
  },
  projects: [
    {
      name: 'signed-in',
      testIgnore: ['**/guest.spec.ts', '**/auth.spec.ts', '**/email-verification.spec.ts', '**/password-recovery.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'guest',
      testMatch: ['**/guest.spec.ts', '**/auth.spec.ts', '**/email-verification.spec.ts', '**/password-recovery.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter api start:dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'node e2e/fixtures/api-proxy.mjs',
      url: 'http://127.0.0.1:3102/__health',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'pnpm dev --port 3100',
      url: baseURL,
      env: { LUDORA_E2E: '1', API_URL: 'http://127.0.0.1:3102' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
