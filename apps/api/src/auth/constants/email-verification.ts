export const EMAIL_VERIFICATION_CONFIG = {
    codeLength: 6,
    expiresInSeconds: 10 * 60,
    maxFailedAttempts: 5,
    resendCooldownSeconds: 60,
} as const;