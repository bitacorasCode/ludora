import { beforeEach, describe, expect, it, vi } from 'vitest';

import { profileApi } from '@/features/profile/server/profile-api';
import { OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api/constants';

import { GET } from './route';

vi.mock('@/features/profile/server/profile-api', () => ({
  profileApi: { get: vi.fn() },
}));

const profileRouteUrl = 'http://localhost/api/profile';
const profile = {
  userId: '123e4567-e89b-42d3-a456-426614174000',
  avatarPresetId: 'fox',
  bio: 'My biography',
} as const;

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/profile', () => {
  it('returns the profile privately without caching and forwards the request signal', async () => {
    const success = { status: OPERATION_STATUS.success, data: profile } as const;
    vi.mocked(profileApi.get).mockResolvedValue(success);
    const controller = new AbortController();
    const request = new Request(profileRouteUrl, { signal: controller.signal });

    const response = await GET(request);

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual(success);
    expect(profileApi.get).toHaveBeenCalledExactlyOnceWith({
      signal: request.signal,
    });
  });

  it.each([
    [API_ERROR_CODES.authenticationRequired, HTTP_STATUS.unauthorized],
    [API_ERROR_CODES.unavailable, HTTP_STATUS.serviceUnavailable],
  ])('maps %s to HTTP %i when the upstream status is absent', async (errorCode, statusCode) => {
    const failure = {
      status: OPERATION_STATUS.error,
      error: { errorCode },
    } as const;
    vi.mocked(profileApi.get).mockResolvedValue(failure);

    const response = await GET(new Request(profileRouteUrl));

    expect(response.status).toBe(statusCode);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual(failure);
  });

  it('preserves the upstream rate limit status and retry information', async () => {
    const failure = {
      status: OPERATION_STATUS.error,
      error: {
        errorCode: 'RATE_LIMIT_EXCEEDED',
        statusCode: HTTP_STATUS.tooManyRequests,
        retryAfterSeconds: 30,
      },
    } as const;
    vi.mocked(profileApi.get).mockResolvedValue(failure);

    const response = await GET(new Request(profileRouteUrl));

    expect(response.status).toBe(HTTP_STATUS.tooManyRequests);
    expect(await response.json()).toEqual(failure);
  });

  it('uses a bad gateway response instead of an invalid upstream success status', async () => {
    const failure = {
      status: OPERATION_STATUS.error,
      error: {
        errorCode: API_ERROR_CODES.invalidResponse,
        statusCode: HTTP_STATUS.ok,
      },
    } as const;
    vi.mocked(profileApi.get).mockResolvedValue(failure);

    const response = await GET(new Request(profileRouteUrl));

    expect(response.status).toBe(HTTP_STATUS.badGateway);
    expect(await response.json()).toEqual(failure);
  });
});
