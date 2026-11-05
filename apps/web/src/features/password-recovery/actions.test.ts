import { AUTH_ERROR_CODES } from '@ludora/security';
import { createTranslator } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { routing } from '@/i18n/routing';
import { ACTION_ERROR_CODES, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS, publicApi } from '@/lib/api';
import { deleteSession } from '@/lib/session';
import esMessages from '@/messages/es.json';

import { requestPasswordRecovery, resetPassword } from './actions';

vi.mock('next-intl/server', () => ({ getTranslations: vi.fn() }));
vi.mock('@/lib/api', async () => ({
  ...(await import('@/lib/api/constants')),
  publicApi: { post: vi.fn() },
}));
vi.mock('@/lib/session', () => ({ deleteSession: vi.fn() }));

const recoveryData = { email: 'player@example.test' };
const token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const resetData = {
  password: 'NewPassword123!',
  confirmPassword: 'NewPassword123!',
};
const rateLimitFailure = {
  status: OPERATION_STATUS.error,
  error: {
    errorCode: 'RATE_LIMIT_EXCEEDED',
    statusCode: HTTP_STATUS.tooManyRequests,
    retryAfterSeconds: 90,
  },
} as const;

beforeEach(() => {
  vi.resetAllMocks();
  const translator = createTranslator({
    locale: 'es',
    messages: esMessages,
    namespace: 'PasswordRecovery.validation',
  });
  vi.mocked(getTranslations).mockResolvedValue(
    translator as Awaited<ReturnType<typeof getTranslations>>,
  );
  vi.mocked(deleteSession).mockResolvedValue(undefined);
});

describe('requestPasswordRecovery', () => {
  beforeEach(() => {
    vi.mocked(publicApi.post).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data: { accepted: true },
    });
  });

  it('returns a generic acknowledgement without exposing account details', async () => {
    vi.mocked(publicApi.post).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data: { accepted: true, userId: 'private-user-id', token: 'private-token' },
    });

    expect(await requestPasswordRecovery('es', recoveryData)).toEqual({
      status: OPERATION_STATUS.success,
      data: null,
    });
    expect(publicApi.post).toHaveBeenCalledExactlyOnceWith(
      '/auth/forgot-password',
      recoveryData,
    );
    expect(getTranslations).toHaveBeenCalledExactlyOnceWith({
      locale: 'es',
      namespace: 'PasswordRecovery.validation',
    });
    expect(deleteSession).not.toHaveBeenCalled();
  });

  it('sends only the validated email address to the API', async () => {
    await requestPasswordRecovery('es', {
      ...recoveryData,
      token: 'untrusted-token',
      userId: 'untrusted-user-id',
    });

    expect(publicApi.post).toHaveBeenCalledExactlyOnceWith(
      '/auth/forgot-password',
      recoveryData,
    );
  });

  it.each(['', 'invalid', 'missing-domain@'])(
    'translates the invalid email error before calling the API: %j',
    async (email) => {
      expect(await requestPasswordRecovery('es', { email })).toEqual({
        status: OPERATION_STATUS.error,
        error: {
          errorCode: ACTION_ERROR_CODES.validationFailed,
          validationErrors: [esMessages.PasswordRecovery.validation.emailInvalid],
        },
      });
      expect(publicApi.post).not.toHaveBeenCalled();
      expect(deleteSession).not.toHaveBeenCalled();
    },
  );

  it.each([null, undefined, [], 'not-an-object', {}, { email: 123 }])(
    'rejects a malformed recovery payload: %j',
    async (data) => {
      expect(await requestPasswordRecovery('es', data)).toMatchObject({
        status: OPERATION_STATUS.error,
        error: { errorCode: ACTION_ERROR_CODES.validationFailed },
      });
      expect(publicApi.post).not.toHaveBeenCalled();
      expect(deleteSession).not.toHaveBeenCalled();
    },
  );

  it.each([API_ERROR_CODES.unavailable, API_ERROR_CODES.requestFailed])(
    'preserves the API or transport error %s',
    async (errorCode) => {
      const failure = {
        status: OPERATION_STATUS.error,
        error: { errorCode },
      } as const;
      vi.mocked(publicApi.post).mockResolvedValue(failure);

      expect(await requestPasswordRecovery('es', recoveryData)).toEqual(failure);
      expect(deleteSession).not.toHaveBeenCalled();
    },
  );

  it('preserves the status and waiting period of a rate limit response', async () => {
    vi.mocked(publicApi.post).mockResolvedValue(rateLimitFailure);

    expect(await requestPasswordRecovery('es', recoveryData)).toEqual(rateLimitFailure);
    expect(deleteSession).not.toHaveBeenCalled();
  });

  it.each([null, {}, { accepted: false }, { accepted: 'true' }, { reset: true }])(
    'rejects an invalid recovery success response: %j',
    async (data) => {
      vi.mocked(publicApi.post).mockResolvedValue({
        status: OPERATION_STATUS.success,
        data,
      });

      expect(await requestPasswordRecovery('es', recoveryData)).toEqual({
        status: OPERATION_STATUS.error,
        error: { errorCode: API_ERROR_CODES.invalidResponse },
      });
      expect(deleteSession).not.toHaveBeenCalled();
    },
  );

  it('uses the default locale when the supplied locale is unsupported', async () => {
    await requestPasswordRecovery('unknown', recoveryData);

    expect(getTranslations).toHaveBeenCalledExactlyOnceWith({
      locale: routing.defaultLocale,
      namespace: 'PasswordRecovery.validation',
    });
  });

  it('propagates API configuration errors without changing the session', async () => {
    vi.mocked(publicApi.post).mockRejectedValue(new Error('Invalid API_URL'));

    await expect(requestPasswordRecovery('es', recoveryData)).rejects.toThrow('Invalid API_URL');
    expect(deleteSession).not.toHaveBeenCalled();
  });

  it('propagates translation errors before calling the API', async () => {
    vi.mocked(getTranslations).mockRejectedValue(new Error('Translations unavailable'));

    await expect(requestPasswordRecovery('es', recoveryData)).rejects.toThrow('Translations unavailable');
    expect(publicApi.post).not.toHaveBeenCalled();
    expect(deleteSession).not.toHaveBeenCalled();
  });
});

describe('resetPassword', () => {
  beforeEach(() => {
    vi.mocked(publicApi.post).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data: { reset: true },
    });
  });

  it('sends only the token and password and deletes the session after confirmed success', async () => {
    vi.mocked(publicApi.post).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data: { reset: true, token: 'private-token', userId: 'private-user-id' },
    });

    expect(await resetPassword('es', token, {
      ...resetData,
      email: 'untrusted@example.test',
      userId: 'untrusted-user-id',
    })).toEqual({ status: OPERATION_STATUS.success, data: null });

    expect(publicApi.post).toHaveBeenCalledExactlyOnceWith(
      '/auth/reset-password',
      { token, password: resetData.password },
    );
    expect(deleteSession).toHaveBeenCalledOnce();
    expect(publicApi.post).toHaveBeenCalledBefore(vi.mocked(deleteSession));
    expect(getTranslations).toHaveBeenCalledExactlyOnceWith({
      locale: 'es',
      namespace: 'PasswordRecovery.validation',
    });
  });

  it('keeps the session until the API has completed the password change', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof publicApi.post>>>();
    vi.mocked(publicApi.post).mockReturnValue(pending.promise);
    const result = resetPassword('es', token, resetData);
    await vi.waitFor(() => expect(publicApi.post).toHaveBeenCalledOnce());

    expect(deleteSession).not.toHaveBeenCalled();
    pending.resolve({ status: OPERATION_STATUS.success, data: { reset: true } });

    await expect(result).resolves.toEqual({ status: OPERATION_STATUS.success, data: null });
    expect(deleteSession).toHaveBeenCalledOnce();
  });

  it.each([undefined, null, '', 'not a token', 'AA==', ['AAAA', 'BBBB'], 123, {}])(
    'rejects an invalid or repeated token before translation or API access: %j',
    async (invalidToken) => {
      expect(await resetPassword('es', invalidToken, resetData)).toEqual({
        status: OPERATION_STATUS.error,
        error: { errorCode: AUTH_ERROR_CODES.passwordResetInvalid },
      });
      expect(getTranslations).not.toHaveBeenCalled();
      expect(publicApi.post).not.toHaveBeenCalled();
      expect(deleteSession).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      data: { ...resetData, password: 'short', confirmPassword: 'short' },
      message: esMessages.PasswordRecovery.validation.passwordMin,
    },
    {
      data: { ...resetData, confirmPassword: '' },
      message: esMessages.PasswordRecovery.validation.confirmPasswordRequired,
    },
    {
      data: { ...resetData, confirmPassword: 'DifferentPassword123!' },
      message: esMessages.PasswordRecovery.validation.passwordMismatch,
    },
  ])('rejects invalid passwords or confirmation: $message', async ({ data, message }) => {
    expect(await resetPassword('es', token, data)).toEqual({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: ACTION_ERROR_CODES.validationFailed,
        validationErrors: [message],
      },
    });
    expect(publicApi.post).not.toHaveBeenCalled();
    expect(deleteSession).not.toHaveBeenCalled();
  });

  it.each([null, undefined, [], 'not-an-object', {}, { password: 123, confirmPassword: 123 }])(
    'rejects a malformed password reset payload: %j',
    async (data) => {
      expect(await resetPassword('es', token, data)).toMatchObject({
        status: OPERATION_STATUS.error,
        error: { errorCode: ACTION_ERROR_CODES.validationFailed },
      });
      expect(publicApi.post).not.toHaveBeenCalled();
      expect(deleteSession).not.toHaveBeenCalled();
    },
  );

  it.each([
    AUTH_ERROR_CODES.passwordResetInvalid,
    API_ERROR_CODES.unavailable,
    API_ERROR_CODES.requestFailed,
  ])('preserves the API or transport error %s without deleting the session', async (errorCode) => {
    const failure = {
      status: OPERATION_STATUS.error,
      error: { errorCode },
    } as const;
    vi.mocked(publicApi.post).mockResolvedValue(failure);

    expect(await resetPassword('es', token, resetData)).toEqual(failure);
    expect(deleteSession).not.toHaveBeenCalled();
  });

  it('preserves the rate limit metadata without deleting the session', async () => {
    vi.mocked(publicApi.post).mockResolvedValue(rateLimitFailure);

    expect(await resetPassword('es', token, resetData)).toEqual(rateLimitFailure);
    expect(deleteSession).not.toHaveBeenCalled();
  });

  it.each([null, {}, { reset: false }, { reset: 'true' }, { accepted: true }])(
    'rejects an invalid reset success response without deleting the session: %j',
    async (data) => {
      vi.mocked(publicApi.post).mockResolvedValue({
        status: OPERATION_STATUS.success,
        data,
      });

      expect(await resetPassword('es', token, resetData)).toEqual({
        status: OPERATION_STATUS.error,
        error: { errorCode: API_ERROR_CODES.invalidResponse },
      });
      expect(deleteSession).not.toHaveBeenCalled();
    },
  );

  it('uses the default locale when the supplied locale is unsupported', async () => {
    await resetPassword('unknown', token, resetData);

    expect(getTranslations).toHaveBeenCalledExactlyOnceWith({
      locale: routing.defaultLocale,
      namespace: 'PasswordRecovery.validation',
    });
  });

  it('propagates API configuration errors without deleting the session', async () => {
    vi.mocked(publicApi.post).mockRejectedValue(new Error('Invalid API_URL'));

    await expect(resetPassword('es', token, resetData)).rejects.toThrow('Invalid API_URL');
    expect(deleteSession).not.toHaveBeenCalled();
  });

  it('propagates cookie deletion errors instead of returning success', async () => {
    vi.mocked(deleteSession).mockRejectedValue(new Error('Cookie unavailable'));

    await expect(resetPassword('es', token, resetData)).rejects.toThrow('Cookie unavailable');
    expect(publicApi.post).toHaveBeenCalledExactlyOnceWith(
      '/auth/reset-password',
      { token, password: resetData.password },
    );
  });
});
