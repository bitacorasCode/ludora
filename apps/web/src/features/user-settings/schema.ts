import { AUTH_VALIDATION } from '@ludora/security';
import { z } from 'zod';

import enMessages from '@/messages/en.json';

type PasswordValidationKey = keyof typeof enMessages.UserSettings.password.validation;

export function createChangePasswordSchema(
  t: (key: PasswordValidationKey) => string,
) {
  return z.object({
    currentPassword: z.string().min(1, t('currentPasswordRequired')),
    newPassword: z.string().min(AUTH_VALIDATION.passwordMinLength, t('passwordMin')),
    confirmPassword: z.string().min(1, t('confirmPasswordRequired')),
  }).refine(
    ({ newPassword, confirmPassword }) =>
      confirmPassword.length === 0 || newPassword === confirmPassword,
    { path: ['confirmPassword'], message: t('passwordMismatch') },
  ).refine(
    ({ currentPassword, newPassword }) =>
      currentPassword.length === 0 || currentPassword !== newPassword,
    { path: ['newPassword'], message: t('passwordUnchanged') },
  );
}

export type ChangePasswordFormData = z.infer<ReturnType<typeof createChangePasswordSchema>>;
