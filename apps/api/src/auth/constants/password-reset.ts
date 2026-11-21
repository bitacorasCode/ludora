import { MILLISECONDS_PER_SECOND, SECONDS_PER_MINUTE } from '../../common/constants/index.js';

export const PASSWORD_RESET_CONFIG = {
    expiresInSeconds: 30 * SECONDS_PER_MINUTE,
    requestCooldownSeconds: SECONDS_PER_MINUTE,
} as const;

export const PASSWORD_RECOVERY_QUEUE = {
    batchSize: 10,
    maxAttempts: 3,
    pollIntervalMs: 2 * MILLISECONDS_PER_SECOND,
    retryDelayMs: 30 * MILLISECONDS_PER_SECOND,
    leaseDurationMs: SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
    maxAgeMs: PASSWORD_RESET_CONFIG.expiresInSeconds * MILLISECONDS_PER_SECOND,
} as const;
