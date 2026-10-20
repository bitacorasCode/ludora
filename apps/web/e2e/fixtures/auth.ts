import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { expect, test as base } from '@playwright/test';

export const API_URL = 'http://localhost:3001';
export const PROXY_URL = 'http://127.0.0.1:3102';
export const SESSION_COOKIE = 'ludora_session';

type TestAccount = {
  id: string;
  email: string;
  nickname: string;
  password: string;
};

function runAccountFixture(
  operation: 'delete' | 'expired-token',
  account: TestAccount,
): Promise<string> {
  const apiDirectory = path.resolve(process.cwd(), '../api');
  return new Promise((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [path.join(apiDirectory, 'test/fixtures/auth-fixture.mjs'), operation],
      {
        cwd: apiDirectory,
      },
      (error, stdout) => {
        if (error)
          reject(new Error(`Local account fixture failed: ${operation}`));
        else resolve(stdout);
      },
    );
    child.stdin!.end(JSON.stringify({ id: account.id, email: account.email }));
  });
}

export function createExpiredToken(account: TestAccount) {
  return runAccountFixture('expired-token', account);
}

export const test = base.extend<
  {
    apiMode: (mode: 'healthy' | 'unavailable' | 'delayed') => Promise<void>;
  },
  { testAccount: TestAccount }
>({
  testAccount: [
    async ({ playwright }, provide) => {
      const api = await playwright.request.newContext({ baseURL: API_URL });
      const identity = randomUUID();
      const credentials = {
        email: `e2e-${identity}@example.test`,
        nickname: `E2E${identity.replaceAll('-', '')}`,
        password: `E2E-${randomUUID()}`,
      };
      const response = await api.post('/auth/register', { data: credentials });
      expect(response.status()).toBe(201);
      const { user } = await response.json();
      const account = { ...credentials, id: user.id };
      try {
        await provide(account);
      } finally {
        try {
          await runAccountFixture('delete', account);
        } finally {
          await api.dispose();
        }
      }
    },
    { scope: 'worker' },
  ],

  storageState: async ({ playwright, testAccount }, provide, testInfo) => {
    if (testInfo.project.name !== 'signed-in') {
      await provide({ cookies: [], origins: [] });
      return;
    }
    const api = await playwright.request.newContext({ baseURL: API_URL });
    try {
      const response = await api.post('/auth/login', {
        data: { email: testAccount.email, password: testAccount.password },
      });
      expect(response.status()).toBe(200);
      const { accessToken } = await response.json();
      await provide({
        cookies: [
          {
            name: SESSION_COOKIE,
            value: accessToken,
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
            expires: Math.floor(Date.now() / 1000) + 900,
          },
        ],
        origins: [],
      });
    } finally {
      await api.dispose();
    }
  },

  apiMode: [
    async ({ request }, provide) => {
      const setMode = async (mode: 'healthy' | 'unavailable' | 'delayed') => {
        const response = await request.post(`${PROXY_URL}/__control`, {
          data: { mode },
        });
        expect(response.ok()).toBe(true);
      };
      await setMode('healthy');
      try {
        await provide(setMode);
      } finally {
        await setMode('healthy');
      }
    },
    { auto: true },
  ],
});

export { expect };
