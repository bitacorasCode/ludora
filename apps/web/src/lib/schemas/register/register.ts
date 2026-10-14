import { z } from 'zod';

import esMessages from '@/messages/es.json';

type ValidationKey = keyof typeof esMessages.Register.validation;

export function createRegisterSchema(
    t: (key: ValidationKey) => string,
) {
    return z.object({
        nickname: z.string().min(2, t('nicknameMin')),
        email: z.email(t('emailInvalid')),
        password: z.string().min(8, t('passwordMin')),
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
