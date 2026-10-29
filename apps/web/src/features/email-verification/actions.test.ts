import { createTranslator } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { routing } from '@/i18n/routing';
import { ACTION_ERROR_CODES, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS, publicApi } from '@/lib/api';
import { createSession } from '@/lib/session';
import esMessages from '@/messages/es.json';

import { resendVerification, verifyEmail } from './actions';

vi.mock('next-intl/server', () => ({ getTranslations: vi.fn() }));
vi.mock('@/lib/api', async () => ({
  ...(await import('@/lib/api/constants')),
  publicApi: { post: vi.fn() },
}));
vi.mock('@/lib/session', () => ({ createSession: vi.fn() }));

const validData = {
  verificationId: 'b75ea701-bdd9-4ec2-8c3e-250090b60c6b',
  code: '123456',
};
const verification = {
  id: validData.verificationId,
  emailSent: true,
  expiresAt: '2026-10-29T15:10:00.000Z',
  resendAvailableAt: '2026-10-29T15:01:00.000Z',
};

beforeEach(() => {
  vi.resetAllMocks();
  const translator = createTranslator({
    locale: 'es',
    messages: esMessages,
    namespace: 'EmailVerification.validation',
  });
  vi.mocked(getTranslations).mockResolvedValue(
    translator as Awaited<ReturnType<typeof getTranslations>>,
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('verifyEmail', () => {
  beforeEach(() => {
    vi.mocked(publicApi.post).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data: { accessToken: 'test-access-token' },
    });
  });

  it('confirms the code and creates the session without returning the token', async () => {
    expect(await verifyEmail('es', validData)).toEqual({
      status: OPERATION_STATUS.success,
      data: null,
    });
    expect(publicApi.post).toHaveBeenCalledExactlyOnceWith('/auth/verify-email', validData);
    expect(createSession).toHaveBeenCalledExactlyOnceWith('test-access-token');
  });

  it('trims the code before sending it to the API', async () => {
    await verifyEmail('es', { ...validData, code: ' 123456 ' });

    expect(publicApi.post).toHaveBeenCalledExactlyOnceWith('/auth/verify-email', validData);
  });

  it.each([
    { data: { ...validData, verificationId: 'invalid' }, message: 'verificationInvalid' },
    { data: { ...validData, code: '' }, message: 'codeRequired' },
    { data: { ...validData, code: '12345' }, message: 'codeInvalid' },
    { data: { ...validData, code: '1234567' }, message: 'codeInvalid' },
    { data: { ...validData, code: 'abcdef' }, message: 'codeInvalid' },
  ] as const)('rejects invalid verification data: $data', async ({ data, message }) => {
    const result = await verifyEmail('es', data);

    expect(result.status).toBe(OPERATION_STATUS.error);
    if (result.status === OPERATION_STATUS.error) {
      expect(result.error.errorCode).toBe(ACTION_ERROR_CODES.validationFailed);
      expect(result.error.validationErrors).toContain(
        esMessages.EmailVerification.validation[message],
      );
    }
    expect(publicApi.post).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each([null, {}, { verificationId: validData.verificationId }])(
    'rejects a malformed payload: %j',
    async (data) => {
      expect((await verifyEmail('es', data)).status).toBe(OPERATION_STATUS.error);
      expect(publicApi.post).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();
    },
  );

  it.each([
    'AUTH_EMAIL_VERIFICATION_CODE_INVALID',
    'AUTH_EMAIL_VERIFICATION_EXPIRED',
    'AUTH_EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED',
    API_ERROR_CODES.unavailable,
  ])('preserves the API or transport error %s', async (errorCode) => {
    const failure = {
      status: OPERATION_STATUS.error,
      error: { errorCode, statusCode: 400 },
    } as const;
    vi.mocked(publicApi.post).mockResolvedValue(failure);

    expect(await verifyEmail('es', validData)).toEqual(failure);
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each([null, {}, { accessToken: '' }, { accessToken: 123 }])(
    'rejects an invalid authentication response: %j',
    async (data) => {
      vi.mocked(publicApi.post).mockResolvedValue({
        status: OPERATION_STATUS.success,
        data,
      });

      expect(await verifyEmail('es', validData)).toEqual({
        status: OPERATION_STATUS.error,
        error: { errorCode: API_ERROR_CODES.invalidResponse },
      });
      expect(createSession).not.toHaveBeenCalled();
    },
  );

  it('uses the default locale when the supplied locale is unsupported', async () => {
    await verifyEmail('unknown', validData);

    expect(getTranslations).toHaveBeenCalledExactlyOnceWith({
      locale: routing.defaultLocale,
      namespace: 'EmailVerification.validation',
    });
  });

  it('propagates configuration errors without creating a session', async () => {
    vi.mocked(publicApi.post).mockRejectedValue(new Error('Invalid API_URL'));

    await expect(verifyEmail('es', validData)).rejects.toThrow('Invalid API_URL');
    expect(createSession).not.toHaveBeenCalled();
  });

  it('propagates session creation errors instead of returning a successful verification', async () => {
    vi.mocked(createSession).mockRejectedValue(new Error('Cookie unavailable'));

    await expect(verifyEmail('es', validData)).rejects.toThrow('Cookie unavailable');
  });
});

describe('resendVerification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-29T15:00:00.000Z'));
    vi.mocked(publicApi.post).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data: { verification },
    });
  });

  afterEach(() => {
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each([true, false])('returns the renewed verification when emailSent is %s', async (emailSent) => {
    vi.mocked(publicApi.post).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data: { verification: { ...verification, emailSent } },
    });

    expect(await resendVerification('es', { verificationId: validData.verificationId })).toEqual({
      status: OPERATION_STATUS.success,
      data: {
        verificationId: validData.verificationId,
        emailSent,
        resendAvailableAt: verification.resendAvailableAt,
        retryAfterSeconds: 60,
      },
    });
    expect(publicApi.post).toHaveBeenCalledExactlyOnceWith('/auth/resend-verification', {
      verificationId: validData.verificationId,
    });
  });

  it.each([
    { resendAvailableAt: '2026-10-29T15:00:00.001Z', retryAfterSeconds: 1 },
    { resendAvailableAt: '2026-10-29T14:59:59.000Z', retryAfterSeconds: 0 },
  ])('calculates the remaining wait using server time: $retryAfterSeconds seconds', async ({
    resendAvailableAt,
    retryAfterSeconds,
  }) => {
    vi.mocked(publicApi.post).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data: { verification: { ...verification, resendAvailableAt } },
    });

    expect(await resendVerification('es', { verificationId: validData.verificationId })).toEqual({
      status: OPERATION_STATUS.success,
      data: {
        verificationId: validData.verificationId,
        emailSent: true,
        resendAvailableAt,
        retryAfterSeconds,
      },
    });
  });

  it.each([null, {}, { verificationId: 'invalid' }])(
    'rejects invalid data before calling the API: %j',
    async (data) => {
      const result = await resendVerification('es', data);

      expect(result.status).toBe(OPERATION_STATUS.error);
      if (result.status === OPERATION_STATUS.error) {
        expect(result.error.errorCode).toBe(ACTION_ERROR_CODES.validationFailed);
        expect(result.error.validationErrors?.length).toBeGreaterThan(0);
      }
      expect(publicApi.post).not.toHaveBeenCalled();
    },
  );

  it.each([
    null,
    {},
    { verification: { ...verification, id: '257c012e-5e70-4a6d-871a-262f20abc8c3' } },
    { verification: { ...verification, emailSent: 'true' } },
    { verification: { ...verification, resendAvailableAt: 'invalid' } },
    { verification: { ...verification, expiresAt: 'invalid' } },
  ])('rejects a mismatched or malformed response: %j', async (data) => {
    vi.mocked(publicApi.post).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data,
    });

    expect(await resendVerification('es', { verificationId: validData.verificationId })).toEqual({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.invalidResponse },
    });
  });

  it('preserves the rate limit error and computes its retry timestamp from server time', async () => {
    const failure = {
      status: OPERATION_STATUS.error,
      error: {
        errorCode: 'AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON',
        statusCode: HTTP_STATUS.tooManyRequests,
        retryAfterSeconds: 37,
      },
    } as const;
    vi.mocked(publicApi.post).mockResolvedValue(failure);

    expect(await resendVerification('es', { verificationId: validData.verificationId })).toEqual({
      ...failure,
      error: { ...failure.error, retryAt: '2026-10-29T15:00:37.000Z' },
    });
  });

  it.each([undefined, 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_VALUE])(
    'preserves a rate limit response without inventing a retry date for %s',
    async (retryAfterSeconds) => {
      const failure = {
        status: OPERATION_STATUS.error,
        error: {
          errorCode: 'AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON',
          statusCode: HTTP_STATUS.tooManyRequests,
          retryAfterSeconds,
        },
      } as const;
      vi.mocked(publicApi.post).mockResolvedValue(failure);

      expect(await resendVerification('es', { verificationId: validData.verificationId })).toEqual(failure);
    },
  );

  it.each(['AUTH_EMAIL_VERIFICATION_INVALID', API_ERROR_CODES.unavailable, API_ERROR_CODES.requestFailed])(
    'preserves the API or transport error %s',
    async (errorCode) => {
      const failure = {
        status: OPERATION_STATUS.error,
        error: { errorCode, statusCode: 400 },
      } as const;
      vi.mocked(publicApi.post).mockResolvedValue(failure);

      expect(await resendVerification('es', { verificationId: validData.verificationId })).toEqual(failure);
    },
  );

  it('uses the default locale when the supplied locale is unsupported', async () => {
    await resendVerification('unknown', { verificationId: validData.verificationId });

    expect(getTranslations).toHaveBeenCalledExactlyOnceWith({
      locale: routing.defaultLocale,
      namespace: 'EmailVerification.validation',
    });
  });

  it('propagates configuration errors', async () => {
    vi.mocked(publicApi.post).mockRejectedValue(new Error('Invalid API_URL'));

    await expect(resendVerification('es', { verificationId: validData.verificationId })).rejects.toThrow(
      'Invalid API_URL',
    );
  });
});
