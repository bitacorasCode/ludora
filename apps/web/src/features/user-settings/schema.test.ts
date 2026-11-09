import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';

import esMessages from '@/messages/es.json';

import { createChangePasswordSchema } from './schema';

const t = createTranslator({
  locale: 'es',
  messages: esMessages,
  namespace: 'UserSettings.password.validation',
});
const schema = createChangePasswordSchema(t);
const validData = {
  currentPassword: 'Current-password',
  newPassword: 'New-password',
  confirmPassword: 'New-password',
};

describe('change password schema', () => {
  it('accepts valid passwords without trimming them', () => {
    const values = { ...validData, newPassword: ' New-password ', confirmPassword: ' New-password ' };

    expect(schema.parse(values)).toEqual(values);
  });

  it.each([
    ['currentPassword', '', 'currentPasswordRequired'],
    ['newPassword', 'short', 'passwordMin'],
    ['confirmPassword', '', 'confirmPasswordRequired'],
    ['confirmPassword', 'Different-password', 'passwordMismatch'],
  ] as const)('rejects an invalid %s', (field, value, message) => {
    const result = schema.safeParse({ ...validData, [field]: value });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: [field],
        message: t(message),
      }));
    }
  });

  it('rejects using the current password again', () => {
    const result = schema.safeParse({
      ...validData,
      newPassword: validData.currentPassword,
      confirmPassword: validData.currentPassword,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: ['newPassword'],
        message: t('passwordUnchanged'),
      }));
    }
  });
});
