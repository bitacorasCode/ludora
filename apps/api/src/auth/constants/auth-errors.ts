import { AUTH_ERROR_CODES } from '@ludora/security';

import type { ApiErrorDefinition } from '../../common/types/api-error-definition.js';

export const AUTH_ERRORS = {
    invalidCredentials: {
        errorCode: AUTH_ERROR_CODES.invalidCredentials,
        message: 'Invalid credentials.',
    },
    authenticationRequired: {
        errorCode: AUTH_ERROR_CODES.authenticationRequired,
        message: 'Authentication required.',
    },
    invalidToken: {
        errorCode: AUTH_ERROR_CODES.invalidToken,
        message: 'Invalid or expired token.',
    },
    invalidTokenPayload: {
        errorCode: AUTH_ERROR_CODES.invalidTokenPayload,
        message: 'Invalid token payload.',
    },
    emailAlreadyExists: {
        errorCode: AUTH_ERROR_CODES.emailAlreadyExists,
        message: 'Email already in use.',
    },
    emailNotVerified: {
        errorCode: AUTH_ERROR_CODES.emailNotVerified,
        message: 'Email verification required.',
    },
    emailVerificationInvalid: {
        errorCode: AUTH_ERROR_CODES.emailVerificationInvalid,
        message: 'Email verification is invalid or no longer available.',
    },
    emailVerificationExpired: {
        errorCode: AUTH_ERROR_CODES.emailVerificationExpired,
        message: 'Email verification has expired.',
    },
    emailVerificationCodeInvalid: {
        errorCode: AUTH_ERROR_CODES.emailVerificationCodeInvalid,
        message: 'Invalid email verification code.',
    },
    emailVerificationAttemptsExceeded: {
        errorCode: AUTH_ERROR_CODES.emailVerificationAttemptsExceeded,
        message: 'Email verification attempt limit reached.',
    },
    emailVerificationResendTooSoon: {
        errorCode: AUTH_ERROR_CODES.emailVerificationResendTooSoon,
        message: 'Please wait before requesting another verification email.',
    },
    nicknameAlreadyExists: {
        errorCode: AUTH_ERROR_CODES.nicknameAlreadyExists,
        message: 'Nickname already in use.',
    },
    passwordResetInvalid: {
        errorCode: AUTH_ERROR_CODES.passwordResetInvalid,
        message: 'Password reset link is invalid or has expired.',
    },
} as const satisfies Record<string, ApiErrorDefinition>;
