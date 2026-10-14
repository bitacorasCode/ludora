import { z } from 'zod';

import esMessages from '@/messages/es.json';

type LoginValidationKey = keyof typeof esMessages.Login.validation;
type RecoveryValidationKey = keyof typeof esMessages.PasswordRecovery.validation;

export function createLoginSchema(t: (key: LoginValidationKey) => string) {
  return z.object({
    email: z.email(t('emailInvalid')),
    password: z.string().min(1, t('passwordRequired')),
  });
}

export function createRecoveryRequestSchema(
  t: (key: RecoveryValidationKey) => string,
) {
  return z.object({ email: z.email(t('emailInvalid')) });
}

export function createPasswordResetSchema(
  t: (key: RecoveryValidationKey) => string,
) {
  return z
    .object({
      password: z.string().min(8, t('passwordMin')),
      confirmPassword: z.string().min(1, t('confirmPasswordRequired')),
    })
    .refine(
      ({ password, confirmPassword }) =>
        confirmPassword.length === 0 || password === confirmPassword,
      { path: ['confirmPassword'], message: t('passwordMismatch') },
    );
}

export type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;
export type RecoveryRequestFormData = z.infer<
  ReturnType<typeof createRecoveryRequestSchema>
>;
export type PasswordResetFormData = z.infer<
  ReturnType<typeof createPasswordResetSchema>
>;
