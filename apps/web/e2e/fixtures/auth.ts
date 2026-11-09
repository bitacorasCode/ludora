import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { expect, test as base } from '@playwright/test';
import { z } from 'zod';

import { MILLISECONDS_PER_SECOND } from '../../src/lib/time/constants';
import { E2E_API_URL as API_URL, E2E_PROXY_URL as PROXY_URL } from '../config';
import { deleteVerificationEmails, waitForVerificationEmail } from './mailpit';

export { API_URL, PROXY_URL };
export const SESSION_COOKIE = 'ludora_session';
const ACCOUNT_FIXTURE_TIMEOUT_MS = 10_000;
const JWT_PAYLOAD_INDEX = 1;
const TOKEN_RENEWAL_MARGIN_SECONDS = 60;

export type TestCredentials = {
  email: string;
  nickname: string;
  password: string;
};
type TestAccount = TestCredentials & { id: string; accessToken: string };
type PendingAccount = Omit<TestAccount, 'accessToken'> & {
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
const accessTokenPayloadSchema = z.object({
  exp: z.number().int().positive(),
});

function getTokenExpiresAtSeconds(accessToken: string): number {
  const payload = accessToken.split('.')[JWT_PAYLOAD_INDEX];

  if (!payload) throw new Error('The test API must return a JWT with an expiration.');

  let data: unknown;

  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw new Error('The test API returned an invalid JWT payload.');
  }

  return accessTokenPayloadSchema.parse(data).exp;
}

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
        await provide({ ...credentials, id, accessToken: authenticated.accessToken });
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
    let expiresAtSeconds = getTokenExpiresAtSeconds(testAccount.accessToken);
    const nowSeconds = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);

    if (expiresAtSeconds <= nowSeconds + TOKEN_RENEWAL_MARGIN_SECONDS) {
      const api = await playwright.request.newContext({ baseURL: API_URL });
      try {
        const response = await api.post('/auth/login', {
          data: { email: testAccount.email, password: testAccount.password },
        });
        expect(response.status()).toBe(200);
        const authenticated = verifiedAccountSchema.parse(await response.json());
        expect(authenticated.user.id).toBe(testAccount.id);
        testAccount.accessToken = authenticated.accessToken;
        expiresAtSeconds = getTokenExpiresAtSeconds(testAccount.accessToken);
      } finally {
        await api.dispose();
      }
    }

    await provide({
      cookies: [
        {
          name: SESSION_COOKIE,
          value: testAccount.accessToken,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
          expires: expiresAtSeconds,
        },
      ],
      origins: [],
    });
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
