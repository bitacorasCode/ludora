import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { expect, test as base } from '@playwright/test';
import { z } from 'zod';

import { deleteVerificationEmails, waitForVerificationEmail } from './mailpit';

export const API_URL = 'http://localhost:3001';
export const PROXY_URL = 'http://127.0.0.1:3102';
export const SESSION_COOKIE = 'ludora_session';
const ACCOUNT_FIXTURE_TIMEOUT_MS = 10_000;

export type TestCredentials = {
  email: string;
  nickname: string;
  password: string;
};
type TestAccount = TestCredentials & { id: string };
type PendingAccount = TestAccount & {
  verificationId: string;
  resendAvailableAt: string;
};

const registrationSchema = z.object({
  user: z.object({ id: z.uuid() }),
  verification: z.object({
    id: z.uuid(),
    emailSent: z.literal(true),
    resendAvailableAt: z.iso.datetime(),
  }),
});
const verifiedAccountSchema = z.object({
  accessToken: z.string().min(1),
  user: z.object({ id: z.uuid() }),
});

function createCredentials(): TestCredentials {
  const identity = randomUUID();
  return {
    email: `e2e-${identity}@example.test`,
    nickname: `E2E${identity.replaceAll('-', '')}`,
    password: `E2E-${randomUUID()}`,
  };
}

function runAccountFixture(
  operation: 'delete' | 'expired-token' | 'expire-password-reset',
  account: Pick<TestCredentials, 'email'> & { id?: string },
): Promise<string> {
  const apiDirectory = path.resolve(process.cwd(), '../api');
  return new Promise((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [path.join(apiDirectory, 'test/fixtures/auth-fixture.mjs'), operation],
      {
        cwd: apiDirectory,
        timeout: ACCOUNT_FIXTURE_TIMEOUT_MS,
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

export function expirePasswordReset(account: TestAccount) {
  return runAccountFixture('expire-password-reset', account);
}

export const test = base.extend<
  {
    apiMode: (mode: 'healthy' | 'unavailable' | 'delayed') => Promise<void>;
    registrationAccount: TestCredentials;
    pendingAccount: PendingAccount;
  },
  { testAccount: TestAccount }
>({
  testAccount: [
    async ({ playwright }, provide) => {
      const api = await playwright.request.newContext({ baseURL: API_URL });
      const credentials = createCredentials();
      let id: string | undefined;
      try {
        const response = await api.post('/auth/register', { data: credentials });
        expect(response.status()).toBe(201);
        const { user, verification } = registrationSchema.parse(await response.json());
        id = user.id;
        const { code } = await waitForVerificationEmail(api, credentials.email);
        const confirmation = await api.post('/auth/verify-email', {
          data: { verificationId: verification.id, code },
        });
        expect(confirmation.status()).toBe(200);
        const authenticated = verifiedAccountSchema.parse(await confirmation.json());
        expect(authenticated.user.id).toBe(id);
        await provide({ ...credentials, id });
      } finally {
        try {
          await runAccountFixture('delete', { ...credentials, id });
        } finally {
          try {
            await deleteVerificationEmails(api, credentials.email);
          } finally {
            await api.dispose();
          }
        }
      }
    },
    { scope: 'worker' },
  ],

  registrationAccount: async ({ playwright }, provide) => {
    const credentials = createCredentials();
    const api = await playwright.request.newContext();
    try {
      await provide(credentials);
    } finally {
      try {
        await runAccountFixture('delete', credentials);
      } finally {
        try {
          await deleteVerificationEmails(api, credentials.email);
        } finally {
          await api.dispose();
        }
      }
    }
  },

  pendingAccount: async ({ request, registrationAccount }, provide) => {
    const response = await request.post(`${API_URL}/auth/register`, {
      data: registrationAccount,
    });
    expect(response.status()).toBe(201);
    const { user, verification } = registrationSchema.parse(await response.json());
    await provide({
      ...registrationAccount,
      id: user.id,
      verificationId: verification.id,
      resendAvailableAt: verification.resendAvailableAt,
    });
  },

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
      const { accessToken } = verifiedAccountSchema.parse(await response.json());
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
