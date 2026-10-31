import { AUTH_ERROR_CODES } from '@ludora/security';

export const EMAIL_VERIFICATION_ERROR_CODES = {
    codeInvalid: AUTH_ERROR_CODES.emailVerificationCodeInvalid,
    resendTooSoon: AUTH_ERROR_CODES.emailVerificationResendTooSoon,
} as const;
