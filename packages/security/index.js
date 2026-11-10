export const HEX_64_PATTERN = /^[a-f0-9]{64}$/i;
export const DIGITS_PATTERN = /^[0-9]+$/;

export const INTERNAL_REQUEST_HEADERS = Object.freeze({
    secret: 'x-ludora-internal-key',
    clientIp: 'x-ludora-client-ip',
});

export const AUTH_NEXT_STEP = Object.freeze({
    authenticated: 'authenticated',
    verifyEmail: 'verifyEmail',
});

export const AUTH_ERROR_CODES = Object.freeze({
    invalidCredentials: 'AUTH_INVALID_CREDENTIALS',
    authenticationRequired: 'AUTHENTICATION_REQUIRED',
    invalidToken: 'AUTH_INVALID_TOKEN',
    invalidTokenPayload: 'AUTH_INVALID_TOKEN_PAYLOAD',
    emailAlreadyExists: 'AUTH_EMAIL_ALREADY_EXISTS',
    emailNotVerified: 'AUTH_EMAIL_NOT_VERIFIED',
    emailVerificationInvalid: 'AUTH_EMAIL_VERIFICATION_INVALID',
    emailVerificationExpired: 'AUTH_EMAIL_VERIFICATION_EXPIRED',
    emailVerificationCodeInvalid: 'AUTH_EMAIL_VERIFICATION_CODE_INVALID',
    emailVerificationAttemptsExceeded: 'AUTH_EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED',
    emailVerificationResendTooSoon: 'AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON',
    nicknameAlreadyExists: 'AUTH_NICKNAME_ALREADY_EXISTS',
    passwordResetInvalid: 'AUTH_PASSWORD_RESET_INVALID',
    currentPasswordInvalid: 'AUTH_CURRENT_PASSWORD_INVALID',
    passwordUnchanged: 'AUTH_PASSWORD_UNCHANGED',
});

export const AUTH_VALIDATION = Object.freeze({
    nicknameMinLength: 2,
    passwordMinLength: 8,
});

export const EMAIL_VERIFICATION_CODE_LENGTH = 6;
export const ACCESS_TOKEN_TTL_SECONDS = 120 * 60;
