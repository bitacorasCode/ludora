import { AUTH_VALIDATION, normalizeEmail, normalizeNickname } from '@ludora/contracts/auth';
import { z } from 'zod';

import esMessages from '@/messages/es.json';

type ValidationKey = keyof typeof esMessages.Register.validation;

export function createRegisterSchema(
    t: (key: ValidationKey, values?: { minLength: number }) => string,
) {
    const { nicknameMinLength, passwordMinLength } = AUTH_VALIDATION;
    const invalidEmail = t('emailInvalid');

    return z.object({
        nickname: z.string()
            .overwrite(normalizeNickname)
            .min(nicknameMinLength, t('nicknameMin', { minLength: nicknameMinLength })),
        email: z.string(invalidEmail).overwrite(normalizeEmail).pipe(z.email(invalidEmail)),
        password: z.string().min(passwordMinLength, t('passwordMin', { minLength: passwordMinLength })),
        confirmPassword: z.string().min(1, t('confirmPasswordRequired')),
    }).refine(
        ({ password, confirmPassword }) =>
            confirmPassword.length === 0 || password === confirmPassword,
        {
            path: ['confirmPassword'],
            message: t('passwordMismatch'),
        },
    );
}

export type RegisterFormData = z.infer<
    ReturnType<typeof createRegisterSchema>
>;
