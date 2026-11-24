import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACTION_ERROR_CODES, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api';

import { currentUser } from '../../../test/fixtures/current-user';
import { saveProfile } from './actions';
import { BIO_MAX_LENGTH, type ProfilePreferences } from './schema';
import { profileApi } from './server/profile-api';

vi.mock('@/lib/api', async () => ({
  ...(await import('@/lib/api/constants')),
}));
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
    expect(profileApi.save).toHaveBeenCalledExactlyOnceWith({ ...validData, expectedUserId: currentUser.id });
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
    expect(profileApi.save).not.toHaveBeenCalled();
  });

  it('preserves an authentication failure from the guarded update', async () => {
    const failure = {
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.authenticationRequired, statusCode: HTTP_STATUS.unauthorized },
    } as const;
    vi.mocked(profileApi.save).mockResolvedValue(failure);

    expect(await saveProfile(currentUser.id, validData)).toEqual(failure);
    expect(profileApi.save).toHaveBeenCalledExactlyOnceWith({ ...validData, expectedUserId: currentUser.id });
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

  it('propagates configuration errors from the update request', async () => {
    vi.mocked(profileApi.save).mockRejectedValue(new Error('Invalid API_URL'));

    await expect(saveProfile(currentUser.id, validData)).rejects.toThrow('Invalid API_URL');
  });
});
