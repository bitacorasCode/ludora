import { EMAIL_VERIFICATION_CODE_LENGTH } from '@ludora/security';

export const EMAIL_VERIFICATION_CONFIG = {
    codeLength: EMAIL_VERIFICATION_CODE_LENGTH,
    expiresInSeconds: 10 * 60,
    maxFailedAttempts: 5,
    resendCooldownSeconds: 60,
} as const;
