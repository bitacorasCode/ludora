import { AUTH_ERROR_CODES, AUTH_NEXT_STEP } from '@ludora/security';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OPERATION_STATUS } from '@/lib/actions';
import { HTTP_STATUS, publicApi } from '@/lib/api';

import { SOCIAL_AUTH_QUERY_PARAMS } from '../config';
import { SOCIAL_AUTH_ENDPOINTS } from './config';
import { handleGoogleCallback } from './google-callback';

const cookieStore = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));
vi.mock('@/lib/api', async () => ({
  ...(await import('@/lib/api/constants')),
  publicApi: { post: vi.fn() },
}));

const flow = { flowToken: 'signed-flow-context', state: 'expected-state', locale: 'es' } as const;
const accessToken = 'private-access-token';
const cookieNames = {
  session: 'ludora_session',
  flow: 'ludora_oauth_flow',
  registration: 'ludora_oauth_registration',
};

function callbackRequest(state: string = flow.state) {
  const url = new URL('http://localhost/api/auth/google/callback');
  url.search = new URLSearchParams({ state, code: 'authorization-code' }).toString();
  return new NextRequest(url);
}

beforeEach(() => {
  vi.resetAllMocks();
  cookieStore.get.mockReturnValue({ value: JSON.stringify(flow) });
  vi.mocked(publicApi.post).mockResolvedValue({
    status: OPERATION_STATUS.success,
    data: { nextStep: AUTH_NEXT_STEP.authenticated, accessToken },
  });
});

describe('Google browser callback', () => {
  it('rejects mismatched state without consuming the active flow or issuing a session', async () => {
    const response = await handleGoogleCallback(callbackRequest('unrelated-state'));
    const location = new URL(response.headers.get('Location')!, 'http://localhost');

    expect(response.status).toBe(HTTP_STATUS.seeOther);
    expect(location.pathname).toBe('/es/login');
    expect(location.searchParams.get(SOCIAL_AUTH_QUERY_PARAMS.error)).toBe(AUTH_ERROR_CODES.oauthFlowInvalid);
    expect(publicApi.post).not.toHaveBeenCalled();
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(cookieStore.delete).not.toHaveBeenCalled();
  });

  it('stores an authenticated result in an HttpOnly cookie and redirects without exposing the JWT', async () => {
    const request = callbackRequest();
    const response = await handleGoogleCallback(request);

    expect(publicApi.post).toHaveBeenCalledExactlyOnceWith(SOCIAL_AUTH_ENDPOINTS.googleCallback, {
      flowToken: flow.flowToken,
      responseParameters: request.nextUrl.searchParams.toString(),
    }, { signal: request.signal });
    expect(cookieStore.set).toHaveBeenCalledWith(cookieNames.flow, '', expect.objectContaining({ maxAge: 0 }));
    expect(cookieStore.set).toHaveBeenCalledWith(cookieNames.session, accessToken, expect.objectContaining({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    }));
    expect(response.headers.get('Location')).toBe('/es');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(await response.text()).toBe('');
  });

  it('keeps a new-account grant in an HttpOnly cookie while redirecting to registration', async () => {
    const registration = {
      registrationToken: 'private-registration-grant',
      expiresAt: '2030-01-01T12:10:00.000Z',
      email: 'player@example.com',
      emailVerified: true,
    };
    vi.mocked(publicApi.post).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data: { nextStep: AUTH_NEXT_STEP.completeRegistration, registration },
    });

    const response = await handleGoogleCallback(callbackRequest());

    expect(cookieStore.set).toHaveBeenCalledWith(cookieNames.registration,
      JSON.stringify({ registrationToken: registration.registrationToken, locale: flow.locale }),
      expect.objectContaining({ httpOnly: true, expires: new Date(registration.expiresAt) }),
    );
    expect(cookieStore.delete).toHaveBeenCalledExactlyOnceWith(cookieNames.session);
    expect(response.headers.get('Location')).toBe('/es/complete-registration');
    expect(await response.text()).toBe('');
  });
});
