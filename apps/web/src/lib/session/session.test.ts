import { ACCESS_TOKEN_TTL_SECONDS } from '@ludora/security';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sessionCredentials } from '../../../test/fixtures/session-credentials';
import { SESSION_REVISION_COOKIE_NAME } from './constants';

const { cookieStore, cookies } = vi.hoisted(() => {
  const cookieStore = { get: vi.fn(), set: vi.fn() };
  return { cookieStore, cookies: vi.fn(async () => cookieStore) };
});

vi.mock('next/headers', () => ({ cookies }));

const cookieScope = { httpOnly: true, secure: false, sameSite: 'lax', path: '/' };

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('NODE_ENV', 'development');
  cookieStore.get.mockReturnValue(undefined);
});

afterEach(() => vi.unstubAllEnvs());

describe('session cookies', () => {
  it('stores both credentials with their corresponding deadlines', async () => {
    const { createSession } = await import('./session');
    await createSession(sessionCredentials);

    expect(cookies).toHaveBeenCalledOnce();
    expect(cookieStore.set).toHaveBeenCalledWith(
      'ludora_session', sessionCredentials.accessToken,
      { ...cookieScope, maxAge: ACCESS_TOKEN_TTL_SECONDS },
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      'ludora_refresh', sessionCredentials.refreshToken,
      { ...cookieScope, expires: new Date(sessionCredentials.absoluteExpiresAt) },
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      SESSION_REVISION_COOKIE_NAME, expect.any(String),
      { ...cookieScope, httpOnly: false },
    );
  });

  it('uses secure cookies and the host-prefixed refresh cookie in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { createSession } = await import('./session');
    await createSession(sessionCredentials);

    const options = expect.objectContaining({ secure: true, httpOnly: true });
    expect(cookieStore.set).toHaveBeenCalledWith('ludora_session', sessionCredentials.accessToken, options);
    expect(cookieStore.set).toHaveBeenCalledWith('__Host-ludora_refresh', sessionCredentials.refreshToken, options);
  });

  it('does not publish a session change for a routine credential rotation', async () => {
    const { createSession } = await import('./session');
    await createSession(sessionCredentials, { isRotation: true });

    expect(cookieStore.set).toHaveBeenCalledTimes(2);
    expect(cookieStore.set).not.toHaveBeenCalledWith(SESSION_REVISION_COOKIE_NAME, expect.anything(), expect.anything());
  });

  it('reads the existing access token', async () => {
    const { getSessionToken } = await import('./session');
    cookieStore.get.mockReturnValue({ value: sessionCredentials.accessToken });
    expect(await getSessionToken()).toBe(sessionCredentials.accessToken);
    expect(cookieStore.get).toHaveBeenCalledWith('ludora_session');
  });

  it('returns undefined without an access cookie', async () => {
    const { getSessionToken } = await import('./session');
    expect(await getSessionToken()).toBeUndefined();
  });

  it('expires both credentials and publishes a session change', async () => {
    const { deleteSession } = await import('./session');
    await deleteSession();

    expect(cookieStore.set).toHaveBeenCalledWith('ludora_session', '', { ...cookieScope, maxAge: 0 });
    expect(cookieStore.set).toHaveBeenCalledWith('ludora_refresh', '', { ...cookieScope, maxAge: 0 });
    expect(cookieStore.set).toHaveBeenCalledWith(
      SESSION_REVISION_COOKIE_NAME, expect.any(String), { ...cookieScope, httpOnly: false },
    );
  });
});
