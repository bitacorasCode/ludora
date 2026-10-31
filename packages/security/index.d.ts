export declare const HEX_64_PATTERN: RegExp;
export declare const DIGITS_PATTERN: RegExp;

export declare const INTERNAL_REQUEST_HEADERS: Readonly<{
    secret: string;
    clientIp: string;
}>;

export declare const AUTH_NEXT_STEP: Readonly<{
    authenticated: 'authenticated';
    verifyEmail: 'verifyEmail';
}>;

export declare const AUTH_ERROR_CODES: Readonly<{
    invalidCredentials: string;
    authenticationRequired: string;
    invalidToken: string;
    invalidTokenPayload: string;
    emailAlreadyExists: string;
    emailNotVerified: string;
    emailVerificationInvalid: string;
    emailVerificationExpired: string;
    emailVerificationCodeInvalid: string;
    emailVerificationAttemptsExceeded: string;
    emailVerificationResendTooSoon: string;
    nicknameAlreadyExists: string;
}>;

export declare const AUTH_VALIDATION: Readonly<{
    nicknameMinLength: number;
    passwordMinLength: number;
}>;

export declare const EMAIL_VERIFICATION_CODE_LENGTH: number;
export declare const ACCESS_TOKEN_TTL_SECONDS: number;
