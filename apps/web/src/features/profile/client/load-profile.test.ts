import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api/constants';

import { loadProfile } from './load-profile';

const fetchMock = vi.fn<typeof fetch>();
const profile = {
  userId: '123e4567-e89b-42d3-a456-426614174000',
  avatarPresetId: 'fox',
  bio: 'My biography',
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadProfile', () => {
  it('loads a validated profile through the same-origin route without caching the response', async () => {
    const result = { status: OPERATION_STATUS.success, data: profile };
    fetchMock.mockResolvedValue(Response.json(result));
    const controller = new AbortController();

    expect(await loadProfile(controller.signal)).toEqual(result);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/profile', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    });
  });

  it('preserves route errors using the HTTP status and server retry information', async () => {
    fetchMock.mockResolvedValue(Response.json({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: 'RATE_LIMIT_EXCEEDED',
        statusCode: HTTP_STATUS.badRequest,
        retryAfterSeconds: 30,
      },
    }, { status: HTTP_STATUS.tooManyRequests }));

    expect(await loadProfile()).toEqual({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: 'RATE_LIMIT_EXCEEDED',
        statusCode: HTTP_STATUS.tooManyRequests,
        retryAfterSeconds: 30,
      },
    });
  });

  it.each([
    null,
    {},
    { status: OPERATION_STATUS.success, data: {} },
    {
      status: OPERATION_STATUS.success,
      data: { ...profile, userId: 'invalid' },
    },
    {
      status: OPERATION_STATUS.success,
      data: { ...profile, avatarPresetId: 'invalid' },
    },
    { status: OPERATION_STATUS.error, error: {} },
  ])('rejects malformed route responses: %j', async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));

    expect(await loadProfile()).toEqual({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: API_ERROR_CODES.invalidResponse,
        statusCode: HTTP_STATUS.ok,
      },
    });
  });

  it('rejects a success payload received with an HTTP error status', async () => {
    fetchMock.mockResolvedValue(Response.json({
      status: OPERATION_STATUS.success,
      data: profile,
    }, { status: HTTP_STATUS.unauthorized }));

    expect(await loadProfile()).toEqual({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: API_ERROR_CODES.invalidResponse,
        statusCode: HTTP_STATUS.unauthorized,
      },
    });
  });

  it('rejects a response that is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Unavailable</html>', {
      status: HTTP_STATUS.serviceUnavailable,
    }));

    expect(await loadProfile()).toEqual({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: API_ERROR_CODES.invalidResponse,
        statusCode: HTTP_STATUS.serviceUnavailable,
      },
    });
  });

  it('returns an unavailable error when the request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    expect(await loadProfile()).toEqual({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.unavailable },
    });
  });
});
