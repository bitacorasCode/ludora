import { defineConfig, devices } from '@playwright/test';

import { E2E_API_PORT, E2E_API_URL, E2E_PROXY_PORT, E2E_PROXY_URL, E2E_WEB_PORT, E2E_WEB_URL } from './e2e/config';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: E2E_WEB_URL,
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
      url: `${E2E_API_URL}/health`,
      env: {
        PORT: E2E_API_PORT.toString(),
        NODE_ENV: 'test',
        RENDER: 'true',
        RENDER_SERVICE_TYPE: 'web',
        MAIL_PROVIDER: 'smtp',
        MAIL_FROM: 'Ludora E2E <no-reply@example.test>',
        SMTP_HOST: '127.0.0.1',
        SMTP_PORT: '1025',
        SMTP_SECURE: 'false',
        RESEND_API_KEY: '',
        PASSWORD_RESET_URL: `${E2E_WEB_URL}/reset-password`,
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'node e2e/fixtures/api-proxy.mjs',
      url: `${E2E_PROXY_URL}/__health`,
      env: {
        LUDORA_E2E_API_URL: E2E_API_URL,
        LUDORA_E2E_PROXY_PORT: E2E_PROXY_PORT.toString(),
      },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `pnpm dev --port ${E2E_WEB_PORT}`,
      url: E2E_WEB_URL,
      env: { LUDORA_E2E: '1', API_URL: E2E_PROXY_URL },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
