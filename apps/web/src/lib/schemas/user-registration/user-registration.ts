import { z } from 'zod';

import esMessages from '@/messages/es.json';

type ValidationKey = keyof typeof esMessages.Register.validation;

export function createUserRegistrationSchema(
    t: (key: ValidationKey) => string,
) {
    return z.object({
        nickname: z.string().min(2, t('nicknameMin')),
        names: z.string().min(2, t('namesMin')),
        lastNames: z.string().min(2, t('lastNamesMin')),
        birthDate: z.date({ error: t('birthDateRequired') }),
        email: z.email(t('emailInvalid')),
        password: z.string().min(8, t('passwordMin')),
    });
}

export type UserRegistrationFormData = z.infer<
    ReturnType<typeof createUserRegistrationSchema>
>;