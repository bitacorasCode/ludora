import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACTION_ERROR_CODES, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

import { currentUser } from '../../../test/fixtures/current-user';
import { saveProfile } from './actions';
import { BIO_MAX_LENGTH, type ProfilePreferences } from './schema';
import { profileApi } from './server/profile-api';

vi.mock('@/lib/api', async () => ({
  ...(await import('@/lib/api/constants')),
}));
vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));
vi.mock('./server/profile-api', () => ({
  profileApi: { save: vi.fn() },
}));

const validData: ProfilePreferences = {
  avatarPresetId: 'fox',
  bio: 'My biography',
};
const otherUserId = '223e4567-e89b-42d3-a456-426614174000';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(currentUser);
  vi.mocked(profileApi.save).mockResolvedValue({
    status: OPERATION_STATUS.success,
    data: { userId: currentUser.id, ...validData },
  });
});

describe('saveProfile', () => {
  it('saves validated preferences for the current user and returns the server result', async () => {
    expect(await saveProfile(currentUser.id, {
      ...validData,
      bio: '  My biography  ',
      userId: otherUserId,
    })).toEqual({
      status: OPERATION_STATUS.success,
      data: { userId: currentUser.id, ...validData },
    });
    expect(getCurrentUser).toHaveBeenCalledOnce();
    expect(profileApi.save).toHaveBeenCalledExactlyOnceWith(validData);
  });

  it.each([
    null,
    {},
    { ...validData, avatarPresetId: 'invalid' },
    { ...validData, bio: 42 },
    { ...validData, bio: 'a'.repeat(BIO_MAX_LENGTH + 1) },
  ])('rejects invalid data before contacting the API: %j', async (data) => {
    expect(await saveProfile(currentUser.id, data)).toEqual({
      status: OPERATION_STATUS.error,
      error: { errorCode: ACTION_ERROR_CODES.validationFailed },
    });
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(profileApi.save).not.toHaveBeenCalled();
  });

  it('rejects a missing session before modifying a profile', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    expect(await saveProfile(currentUser.id, validData)).toEqual({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: API_ERROR_CODES.authenticationRequired,
        statusCode: HTTP_STATUS.unauthorized,
      },
    });
    expect(profileApi.save).not.toHaveBeenCalled();
  });

  it('rejects an account change before modifying the newly signed-in user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...currentUser,
      id: otherUserId,
    });

    expect(await saveProfile(currentUser.id, validData)).toEqual({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: API_ERROR_CODES.authenticationRequired,
        statusCode: HTTP_STATUS.unauthorized,
      },
    });
    expect(profileApi.save).not.toHaveBeenCalled();
  });

  it('preserves API errors and retry information', async () => {
    const failure = {
      status: OPERATION_STATUS.error,
      error: {
        errorCode: 'RATE_LIMIT_EXCEEDED',
        statusCode: HTTP_STATUS.tooManyRequests,
        retryAfterSeconds: 30,
      },
    } as const;
    vi.mocked(profileApi.save).mockResolvedValue(failure);

    expect(await saveProfile(currentUser.id, validData)).toEqual(failure);
  });

  it('does not mutate a profile when the current session cannot be checked', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('API unavailable'));

    await expect(saveProfile(currentUser.id, validData)).rejects.toThrow(
      'API unavailable',
    );
    expect(profileApi.save).not.toHaveBeenCalled();
  });
});
