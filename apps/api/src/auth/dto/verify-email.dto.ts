import { DIGITS_PATTERN } from '@ludora/security';
import { z } from 'zod';

import { EMAIL_VERIFICATION_CONFIG } from '../constants/email-verification.js';

const { codeLength } = EMAIL_VERIFICATION_CONFIG;

export const verifyEmailSchema = z.strictObject({
    verificationId: z.uuid(),
    code: z
        .string()
        .trim()
        .length(codeLength)
        .regex(DIGITS_PATTERN),
});

export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
