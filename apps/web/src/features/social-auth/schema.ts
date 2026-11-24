import { AUTH_VALIDATION, normalizeEmail, normalizeNickname } from '@ludora/contracts/auth';
import { z } from 'zod';

export function createSocialRegistrationSchema(
    t: {
        (key: 'emailInvalid'): string;
        (key: 'nicknameMin', values: { minLength: number }): string;
    },
    requiresEmail: boolean,
) {
    const { nicknameMinLength } = AUTH_VALIDATION;
    const emailSchema = z.string().overwrite(normalizeEmail).pipe(z.email(t('emailInvalid')));

    return z.object({
        nickname: z.string()
            .overwrite(normalizeNickname)
            .min(nicknameMinLength, t('nicknameMin', { minLength: nicknameMinLength })),
        email: requiresEmail
            ? emailSchema
            : z.union([z.literal(''), emailSchema]).optional(),
    });
}

export type SocialRegistrationFormData = z.infer<
    ReturnType<typeof createSocialRegistrationSchema>
>;
