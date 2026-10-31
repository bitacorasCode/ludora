import { AUTH_VALIDATION } from '@ludora/security';
import { z } from 'zod';

import esMessages from '@/messages/es.json';

type ValidationKey = keyof typeof esMessages.Register.validation;

export function createRegisterSchema(
    t: (key: ValidationKey) => string,
) {
    return z.object({
        nickname: z.string().min(AUTH_VALIDATION.nicknameMinLength, t('nicknameMin')),
        email: z.email(t('emailInvalid')),
        password: z.string().min(AUTH_VALIDATION.passwordMinLength, t('passwordMin')),
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
