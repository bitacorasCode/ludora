import { createTranslator } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { routing } from '@/i18n/routing';
import type { RegisterFormData } from '@/lib/schemas';
import esMessages from '@/messages/es.json';

import { registerUser } from './actions';

vi.mock('next-intl/server', () => ({ getTranslations: vi.fn() }));

const validData: RegisterFormData = {
  nickname: 'Jugador',
  email: 'jugador@example.com',
  password: 'password123',
  confirmPassword: 'password123',
};

beforeEach(() => {
  vi.clearAllMocks();
  const translator = createTranslator({
    locale: 'es',
    messages: esMessages,
    namespace: 'Register.validation',
  });
  vi.mocked(getTranslations).mockResolvedValue(
    translator as Awaited<ReturnType<typeof getTranslations>>,
  );
});

describe('registerUser validation', () => {
  it('rejects invalid data sent directly to the action', async () => {
    const result = await registerUser('es', { ...validData, email: 'invalid' });
    expect(result).toEqual({
      status: 'invalid',
      errors: [esMessages.Register.validation.emailInvalid],
    });
  });

  it('rejects passwords that do not match', async () => {
    const result = await registerUser('es', {
      ...validData,
      confirmPassword: 'another-password',
    });
    expect(result).toEqual({
      status: 'invalid',
      errors: [esMessages.Register.validation.passwordMismatch],
    });
  });

  it('rejects an empty password confirmation', async () => {
    const result = await registerUser('es', {
      ...validData,
      confirmPassword: '',
    });
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid')
      expect(result.errors).toContain(
        esMessages.Register.validation.confirmPasswordRequired,
      );
  });

  it('rejects a malformed payload without crashing', async () => {
    const result = await registerUser('es', {} as RegisterFormData);
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid')
      expect(result.errors.length).toBeGreaterThan(0);
  });

  it('requests translations for the supported locale', async () => {
    await registerUser('es', { ...validData, email: 'invalid' });
    expect(getTranslations).toHaveBeenCalledExactlyOnceWith({
      locale: 'es',
      namespace: 'Register.validation',
    });
  });

  it('uses the default locale for an unsupported locale', async () => {
    await registerUser('unknown', { ...validData, email: 'invalid' });
    expect(getTranslations).toHaveBeenCalledExactlyOnceWith({
      locale: routing.defaultLocale,
      namespace: 'Register.validation',
    });
  });
});
