import { ACCESS_TOKEN_TTL_SECONDS } from '@ludora/security';
import { cookies } from 'next/headers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSession, deleteSession, getSessionToken } from './session';

const cookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => cookieStore) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NODE_ENV', 'development');
  cookieStore.get.mockReturnValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe('session cookie', () => {
  it('creates an HttpOnly cookie with the configured lifetime and scope', async () => {
    await createSession('test-token');
    expect(cookies).toHaveBeenCalledOnce();
    expect(cookieStore.set).toHaveBeenCalledExactlyOnceWith(
      'ludora_session',
      'test-token',
      {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: ACCESS_TOKEN_TTL_SECONDS,
      },
    );
  });

  it('requires secure transport in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await createSession('test-token');
    expect(cookieStore.set).toHaveBeenCalledWith(
      'ludora_session',
      'test-token',
      expect.objectContaining({ secure: true, httpOnly: true }),
    );
  });

  it('reads the existing token', async () => {
    cookieStore.get.mockReturnValue({ value: 'test-token' });
    expect(await getSessionToken()).toBe('test-token');
    expect(cookieStore.get).toHaveBeenCalledWith('ludora_session');
  });

  it('returns undefined without a session cookie', async () => {
    expect(await getSessionToken()).toBeUndefined();
  });

  it('deletes the session cookie', async () => {
    await deleteSession();
    expect(cookieStore.delete).toHaveBeenCalledExactlyOnceWith(
      'ludora_session',
    );
  });
});
