import { AUTH_ERROR_CODES } from '@ludora/security';

// Allow time for Nest to return the verification state after mail submission times out.
export const EMAIL_VERIFICATION_API_TIMEOUT_MS = 15_000;

export const EMAIL_VERIFICATION_QUERY_PARAMS = {
    verificationId: 'verificationId',
    resendAvailableAt: 'resendAvailableAt',
    delivery: 'delivery',
} as const;

export const EMAIL_VERIFICATION_DELIVERY = {
    unconfirmed: 'unconfirmed',
} as const;

export const EMAIL_VERIFICATION_ERROR_CODES = {
    codeInvalid: AUTH_ERROR_CODES.emailVerificationCodeInvalid,
    resendTooSoon: AUTH_ERROR_CODES.emailVerificationResendTooSoon,
} as const;
