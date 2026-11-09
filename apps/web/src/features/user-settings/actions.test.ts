import { createTranslator } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACTION_ERROR_CODES, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, authenticatedApi, HTTP_STATUS } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { createSession } from '@/lib/session';
import esMessages from '@/messages/es.json';

import { currentUser } from '../../../test/fixtures/current-user';
import { changePassword } from './actions';

vi.mock('@/lib/api', async () => ({
  ...(await import('@/lib/api/constants')),
  authenticatedApi: { post: vi.fn() },
}));
vi.mock('@/lib/auth', async () => ({
  ...(await import('@/lib/auth/schemas')),
  getCurrentUser: vi.fn(),
}));
vi.mock('@/lib/session', () => ({ createSession: vi.fn() }));
vi.mock('next-intl/server', () => ({
  getTranslations: async () => createTranslator({
    locale: 'es',
    messages: esMessages,
    namespace: 'UserSettings.password.validation',
  }),
}));

const validData = {
  currentPassword: 'Current-password',
  newPassword: 'New-password',
  confirmPassword: 'New-password',
};
const otherUserId = '223e4567-e89b-42d3-a456-426614174000';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(currentUser);
  vi.mocked(authenticatedApi.post).mockResolvedValue({
    status: OPERATION_STATUS.success,
    data: { accessToken: 'rotated-token', user: currentUser },
  });
});

describe('changePassword', () => {
  it('sends only current and new passwords and rotates the HttpOnly session', async () => {
    expect(await changePassword('es', currentUser.id, validData)).toEqual({
      status: OPERATION_STATUS.success,
      data: null,
    });
    expect(authenticatedApi.post).toHaveBeenCalledExactlyOnceWith('/auth/change-password', {
      currentPassword: validData.currentPassword,
      password: validData.newPassword,
    });
    expect(createSession).toHaveBeenCalledExactlyOnceWith('rotated-token');
  });

  it.each([
    null,
    {},
    { ...validData, currentPassword: '' },
    { ...validData, newPassword: 'short' },
    { ...validData, confirmPassword: '' },
    { ...validData, confirmPassword: 'Different-password' },
    { ...validData, newPassword: validData.currentPassword, confirmPassword: validData.currentPassword },
  ])('rejects invalid input before accessing the session or API: %j', async (data) => {
    expect(await changePassword('es', currentUser.id, data)).toEqual({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: ACTION_ERROR_CODES.validationFailed,
        validationErrors: expect.any(Array),
      },
    });
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(authenticatedApi.post).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each([null, { ...currentUser, id: otherUserId }])(
    'rejects missing or changed accounts without changing their password', async (user) => {
      vi.mocked(getCurrentUser).mockResolvedValue(user);

      expect(await changePassword('es', currentUser.id, validData)).toEqual({
        status: OPERATION_STATUS.error,
        error: {
          errorCode: API_ERROR_CODES.authenticationRequired,
          statusCode: HTTP_STATUS.unauthorized,
        },
      });
      expect(authenticatedApi.post).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();
    },
  );

  it('preserves a request limit and its waiting period', async () => {
    const failure = {
      status: OPERATION_STATUS.error,
      error: {
        errorCode: 'RATE_LIMIT_EXCEEDED',
        statusCode: HTTP_STATUS.tooManyRequests,
        retryAfterSeconds: 30,
      },
    } as const;
    vi.mocked(authenticatedApi.post).mockResolvedValue(failure);

    expect(await changePassword('es', currentUser.id, validData)).toEqual(failure);
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { accessToken: '' },
    { accessToken: 'rotated-token' },
    { accessToken: 'rotated-token', user: { id: otherUserId } },
  ])('keeps the current cookie when the server response is invalid: %j', async (data) => {
    vi.mocked(authenticatedApi.post).mockResolvedValue({ status: OPERATION_STATUS.success, data });

    expect(await changePassword('es', currentUser.id, validData)).toEqual({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.invalidResponse },
    });
    expect(createSession).not.toHaveBeenCalled();
  });
});
