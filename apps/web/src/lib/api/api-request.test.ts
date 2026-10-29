import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OPERATION_STATUS } from '@/lib/actions';

import { apiRequest } from './api-request';
import { API_ERROR_CODES } from './constants';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('API_URL', 'https://api.example.test');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('apiRequest', () => {
  it('returns a JSON response with safe transport defaults', async () => {
    fetchMock.mockResolvedValue(Response.json({ user: 'test' }));
    expect(await apiRequest('/auth/me')).toEqual({
      status: OPERATION_STATUS.success,
      data: { user: 'test' },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://api.example.test/auth/me'),
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it.each([
    '//external.example.test/auth/me',
    '/\\external.example.test/auth/me',
    'https://external.example.test',
  ])(
    'rejects a path that could escape the configured origin: %s',
    async (path) => {
      expect(await apiRequest(path)).toEqual({
        status: OPERATION_STATUS.error,
        error: { errorCode: API_ERROR_CODES.invalidRequest },
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('preserves backend error codes and HTTP status', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ errorCode: 'AUTH_INVALID_CREDENTIALS' }, { status: 401 }),
    );
    expect(await apiRequest('/auth/login')).toEqual({
      status: OPERATION_STATUS.error,
      error: { errorCode: 'AUTH_INVALID_CREDENTIALS', statusCode: 401 },
    });
  });

  it('preserves the server waiting time when a resend is rate limited', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          errorCode: 'AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON',
          retryAfterSeconds: 37,
        },
        { status: 429 },
      ),
    );

    expect(await apiRequest('/auth/resend-verification')).toEqual({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: 'AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON',
        statusCode: 429,
        retryAfterSeconds: 37,
      },
    });
  });

  it.each([undefined, null, '37', 0, -1, 1.5])(
    'preserves the error code while discarding an invalid waiting time: %j',
    async (retryAfterSeconds) => {
      fetchMock.mockResolvedValue(
        Response.json(
          {
            errorCode: 'AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON',
            retryAfterSeconds,
          },
          { status: 429 },
        ),
      );

      expect(await apiRequest('/auth/resend-verification')).toEqual({
        status: OPERATION_STATUS.error,
        error: {
          errorCode: 'AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON',
          statusCode: 429,
        },
      });
    },
  );

  it('returns a generic code for an unrecognized HTTP error', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ message: 'Internal error' }, { status: 500 }),
    );
    expect(await apiRequest('/auth/me')).toEqual({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.requestFailed, statusCode: 500 },
    });
  });

  it('returns API_UNAVAILABLE for a connection failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect(await apiRequest('/auth/me')).toEqual({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.unavailable },
    });
  });

  it('returns API_UNAVAILABLE for a timeout', async () => {
    fetchMock.mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));
    expect(await apiRequest('/auth/me')).toEqual({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.unavailable },
    });
  });

  it('rejects invalid JSON responses', async () => {
    fetchMock.mockResolvedValue(new Response('not JSON', { status: 200 }));
    expect(await apiRequest('/auth/me')).toEqual({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.invalidResponse, statusCode: 200 },
    });
  });

  it('propagates configuration errors before making a request', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('API_URL', 'http://localhost:3001');
    await expect(apiRequest('/auth/me')).rejects.toThrow('must use HTTPS');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
