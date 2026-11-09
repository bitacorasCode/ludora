import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, authenticatedApi, HTTP_STATUS } from '@/lib/api';

import { profileApi } from './profile-api';

vi.mock('@/lib/api', async () => ({
  ...(await import('@/lib/api/constants')),
  authenticatedApi: { get: vi.fn(), put: vi.fn() },
}));

const preferences = { avatarPresetId: 'fox', bio: 'My biography' } as const;
const profile = {
  userId: '123e4567-e89b-42d3-a456-426614174000',
  ...preferences,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('profileApi', () => {
  it('loads the validated profile through the authenticated API and forwards cancellation', async () => {
    const controller = new AbortController();
    const success = { status: OPERATION_STATUS.success, data: profile } as const;
    vi.mocked(authenticatedApi.get).mockResolvedValue(success);

    expect(await profileApi.get({ signal: controller.signal })).toEqual(success);
    expect(authenticatedApi.get).toHaveBeenCalledExactlyOnceWith('/profile', {
      signal: controller.signal,
    });
  });

  it('saves preferences and returns the validated profile supplied by Nest', async () => {
    const success = { status: OPERATION_STATUS.success, data: profile } as const;
    vi.mocked(authenticatedApi.put).mockResolvedValue(success);

    expect(await profileApi.save(preferences)).toEqual(success);
    expect(authenticatedApi.put).toHaveBeenCalledExactlyOnceWith(
      '/profile',
      preferences,
    );
  });

  it('preserves read failures without treating them as empty profiles', async () => {
    const failure = {
      status: OPERATION_STATUS.error,
      error: {
        errorCode: API_ERROR_CODES.authenticationRequired,
        statusCode: HTTP_STATUS.unauthorized,
      },
    } as const;
    vi.mocked(authenticatedApi.get).mockResolvedValue(failure);

    expect(await profileApi.get()).toEqual(failure);
  });

  it('preserves save failures and retry information', async () => {
    const failure = {
      status: OPERATION_STATUS.error,
      error: {
        errorCode: 'RATE_LIMIT_EXCEEDED',
        statusCode: HTTP_STATUS.tooManyRequests,
        retryAfterSeconds: 30,
      },
    } as const;
    vi.mocked(authenticatedApi.put).mockResolvedValue(failure);

    expect(await profileApi.save(preferences)).toEqual(failure);
  });

  it.each([
    null,
    {},
    { ...profile, userId: 'invalid' },
    { ...profile, avatarPresetId: 'invalid' },
  ])('rejects malformed profiles returned by the read endpoint: %j', async (data) => {
    vi.mocked(authenticatedApi.get).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data,
    });

    expect(await profileApi.get()).toEqual({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.invalidResponse },
    });
  });

  it('rejects a save response that does not include the profile owner', async () => {
    vi.mocked(authenticatedApi.put).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data: preferences,
    });

    expect(await profileApi.save(preferences)).toEqual({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.invalidResponse },
    });
  });
});
