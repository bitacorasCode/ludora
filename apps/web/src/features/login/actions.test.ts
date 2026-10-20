import { createTranslator } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { routing } from '@/i18n/routing';
import { ACTION_ERROR_CODES, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, publicApi } from '@/lib/api';
import { createSession } from '@/lib/session';
import esMessages from '@/messages/es.json';

import { loginUser } from './actions';

vi.mock('next-intl/server', () => ({ getTranslations: vi.fn() }));
vi.mock('@/lib/api', async () => ({
  ...(await import('@/lib/api/constants')),
  publicApi: { post: vi.fn() },
}));
vi.mock('@/lib/session', () => ({ createSession: vi.fn() }));

const validData = { email: 'jugador@example.test', password: 'password123' };

beforeEach(() => {
  vi.resetAllMocks();
  const translator = createTranslator({
    locale: 'es',
    messages: esMessages,
    namespace: 'Login.validation',
  });
  vi.mocked(getTranslations).mockResolvedValue(
    translator as Awaited<ReturnType<typeof getTranslations>>,
  );
  vi.mocked(publicApi.post).mockResolvedValue({
    status: OPERATION_STATUS.success,
    data: { accessToken: 'test-access-token' },
  });
});

describe('loginUser', () => {
  it('creates the session after a valid backend response', async () => {
    expect(await loginUser('es', validData)).toEqual({
      status: OPERATION_STATUS.success,
      data: null,
    });
    expect(publicApi.post).toHaveBeenCalledExactlyOnceWith(
      '/auth/login',
      validData,
    );
    expect(createSession).toHaveBeenCalledExactlyOnceWith('test-access-token');
  });

  it('rejects invalid data before calling the API', async () => {
    expect(await loginUser('es', { ...validData, email: 'invalid' })).toEqual({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: ACTION_ERROR_CODES.validationFailed,
        validationErrors: [esMessages.Login.validation.emailInvalid],
      },
    });
    expect(publicApi.post).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('rejects a malformed payload', async () => {
    expect((await loginUser('es', null)).status).toBe(OPERATION_STATUS.error);
    expect(publicApi.post).not.toHaveBeenCalled();
  });

  it.each(['AUTH_INVALID_CREDENTIALS', API_ERROR_CODES.unavailable])(
    'preserves the backend or transport error %s',
    async (errorCode) => {
      const failure = {
        status: OPERATION_STATUS.error,
        error: { errorCode },
      } as const;
      vi.mocked(publicApi.post).mockResolvedValue(failure);
      expect(await loginUser('es', validData)).toEqual(failure);
      expect(createSession).not.toHaveBeenCalled();
    },
  );

  it.each([{}, { accessToken: '' }, { accessToken: 123 }])(
    'rejects an invalid success response: %j',
    async (data) => {
      vi.mocked(publicApi.post).mockResolvedValue({
        status: OPERATION_STATUS.success,
        data,
      });
      expect(await loginUser('es', validData)).toEqual({
        status: OPERATION_STATUS.error,
        error: { errorCode: API_ERROR_CODES.invalidResponse },
      });
      expect(createSession).not.toHaveBeenCalled();
    },
  );

  it('uses the default locale when the supplied locale is unsupported', async () => {
    await loginUser('unknown', validData);
    expect(getTranslations).toHaveBeenCalledExactlyOnceWith({
      locale: routing.defaultLocale,
      namespace: 'Login.validation',
    });
  });

  it('propagates configuration errors without creating a session', async () => {
    vi.mocked(publicApi.post).mockRejectedValue(new Error('Invalid API_URL'));
    await expect(loginUser('es', validData)).rejects.toThrow('Invalid API_URL');
    expect(createSession).not.toHaveBeenCalled();
  });
});
