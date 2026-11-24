import { DIGITS_PATTERN, EMAIL_VERIFICATION_CODE_LENGTH } from '@ludora/contracts/auth';
import { z } from 'zod';

import type esMessages from '@/messages/es.json';

type ValidationKey = keyof typeof esMessages.EmailVerification.validation;

export { EMAIL_VERIFICATION_CODE_LENGTH } from '@ludora/contracts/auth';

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
            .regex(DIGITS_PATTERN, t('codeInvalid')),
    });
}

export type EmailVerificationFormData = z.infer<
    ReturnType<typeof createEmailVerificationSchema>
>;
