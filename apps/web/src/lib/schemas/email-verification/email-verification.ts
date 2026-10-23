import { z } from 'zod';

import type esMessages from '@/messages/es.json';

type ValidationKey = keyof typeof esMessages.EmailVerification.validation;

export const EMAIL_VERIFICATION_CODE_LENGTH = 6;

export function createEmailVerificationSchema(
    t: (key: ValidationKey) => string,
) {
    return z.object({
        verificationId: z.uuid(t('verificationInvalid')),
        code: z
            .string()
            .trim()
            .min(1, t('codeRequired'))
            .length(EMAIL_VERIFICATION_CODE_LENGTH, t('codeInvalid'))
            .regex(/^[0-9]+$/, t('codeInvalid')),
    });
}

export type EmailVerificationFormData = z.infer<
    ReturnType<typeof createEmailVerificationSchema>
>;
