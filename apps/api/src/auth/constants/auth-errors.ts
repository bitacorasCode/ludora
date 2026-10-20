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
    nicknameAlreadyExists: {
        errorCode: 'AUTH_NICKNAME_ALREADY_EXISTS',
        message: 'Nickname already in use.',
    },
} as const satisfies Record<string, ApiErrorDefinition>;
