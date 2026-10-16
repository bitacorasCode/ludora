import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:3100';
const guestURL = 'http://localhost:3101';

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
      testIgnore: '**/guest.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'guest',
      testMatch: '**/guest.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: guestURL },
    },
  ],
  webServer: [
    {
      command: 'pnpm dev --port 3100',
      url: baseURL,
      env: { LUDORA_E2E_MODE: 'signed-in' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'pnpm dev --port 3101',
      url: guestURL,
      env: { LUDORA_E2E_MODE: 'guest' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
