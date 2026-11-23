import { MILLISECONDS_PER_SECOND, SECONDS_PER_MINUTE } from '../../common/constants/time.js';

export const AUTH_MAIL_QUEUE = {
    batchSize: 10,
    maxAttempts: 3,
    pollIntervalMs: 2 * MILLISECONDS_PER_SECOND,
    retryDelayMs: 30 * MILLISECONDS_PER_SECOND,
    leaseDurationMs: SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
} as const;
