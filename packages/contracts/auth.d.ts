export declare const DIGITS_PATTERN: RegExp;

export declare const AUTH_NEXT_STEP: Readonly<{
    authenticated: 'authenticated';
    verifyEmail: 'verifyEmail';
    completeRegistration: 'completeRegistration';
}>;

export declare const PASSWORD_FORM_MODE: Readonly<{
    create: 'create';
    reset: 'reset';
}>;

export type PasswordFormMode = typeof PASSWORD_FORM_MODE[keyof typeof PASSWORD_FORM_MODE];

export declare const AUTH_ERROR_CODES: Readonly<{
    invalidCredentials: string;
    authenticationRequired: string;
    invalidToken: string;
    invalidTokenPayload: string;
    refreshTokenAlreadyRotated: string;
    emailAlreadyExists: string;
    emailNotVerified: string;
    emailVerificationInvalid: string;
    emailVerificationExpired: string;
    emailVerificationCodeInvalid: string;
    emailVerificationAttemptsExceeded: string;
    emailVerificationResendTooSoon: string;
    nicknameAlreadyExists: string;
    passwordResetInvalid: string;
    currentPasswordInvalid: string;
    passwordUnchanged: string;
    oauthFlowInvalid: string;
    oauthAuthenticationFailed: string;
    oauthUnavailable: string;
    oauthAccountLinkRequired: string;
    oauthRegistrationInvalid: string;
    oauthEmailRequired: string;
    oauthEmailMismatch: string;
    oauthIdentityAlreadyLinked: string;
    oauthCancelled: string;
}>;

export declare const AUTH_VALIDATION: Readonly<{
    nicknameMinLength: number;
    passwordMinLength: number;
}>;

export declare const EMAIL_VERIFICATION_CODE_LENGTH: number;

export declare function normalizeNickname(nickname: string): string;
export declare function normalizeEmail(email: string): string;
