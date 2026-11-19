import { AUTH_VALIDATION } from '@ludora/security';
import { z } from 'zod';

export function createSocialRegistrationSchema(
    t: (key: 'nicknameMin' | 'emailInvalid') => string,
    requiresEmail: boolean,
) {
    const emailSchema = z.string().trim().toLowerCase().pipe(z.email(t('emailInvalid')));

    return z.object({
        nickname: z.string().trim().min(AUTH_VALIDATION.nicknameMinLength, t('nicknameMin')),
        email: requiresEmail
            ? emailSchema
            : z.union([z.literal(''), emailSchema]).optional(),
    });
}

export type SocialRegistrationFormData = z.infer<
    ReturnType<typeof createSocialRegistrationSchema>
>;
