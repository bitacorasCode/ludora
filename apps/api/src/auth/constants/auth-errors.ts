import type { ApiErrorDefinition } from '../../common/types/api-error-definition.js';

export const AUTH_ERRORS = {
    invalidCredentials: {
        errorCode: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid credentials.',
    },
    authenticationRequired: {
        errorCode: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
    },
    invalidToken: {
        errorCode: 'AUTH_INVALID_TOKEN',
        message: 'Invalid or expired token.',
    },
    invalidTokenPayload: {
        errorCode: 'AUTH_INVALID_TOKEN_PAYLOAD',
        message: 'Invalid token payload.',
    },
    emailAlreadyExists: {
        errorCode: 'AUTH_EMAIL_ALREADY_EXISTS',
        message: 'Email already in use.',
    },
    emailNotVerified: {
        errorCode: 'AUTH_EMAIL_NOT_VERIFIED',
        message: 'Email verification required.',
    },
    emailVerificationInvalid: {
        errorCode: 'AUTH_EMAIL_VERIFICATION_INVALID',
        message: 'Email verification is invalid or no longer available.',
    },
    emailVerificationExpired: {
        errorCode: 'AUTH_EMAIL_VERIFICATION_EXPIRED',
        message: 'Email verification has expired.',
    },
    emailVerificationCodeInvalid: {
        errorCode: 'AUTH_EMAIL_VERIFICATION_CODE_INVALID',
        message: 'Invalid email verification code.',
    },
    emailVerificationAttemptsExceeded: {
        errorCode: 'AUTH_EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED',
        message: 'Email verification attempt limit reached.',
    },
    emailVerificationResendTooSoon: {
        errorCode: 'AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON',
        message: 'Please wait before requesting another verification email.',
    },
    nicknameAlreadyExists: {
        errorCode: 'AUTH_NICKNAME_ALREADY_EXISTS',
        message: 'Nickname already in use.',
    },
} as const satisfies Record<string, ApiErrorDefinition>;
