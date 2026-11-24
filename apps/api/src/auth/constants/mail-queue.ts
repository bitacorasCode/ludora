import { MILLISECONDS_PER_SECOND, SECONDS_PER_MINUTE } from '../../common/constants/time.js';

export const AUTH_MAIL_QUEUE = {
    batchSize: 10,
    maxAttempts: 3,
    pollIntervalMs: 2 * MILLISECONDS_PER_SECOND,
    retryDelayMs: 30 * MILLISECONDS_PER_SECOND,
    leaseDurationMs: SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
    backlogWarningThresholdMs: SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
    backlogWarningIntervalMs: 5 * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
} as const;

export const AUTH_MAIL_QUEUE_LOGS = {
    retryScheduled: 'Mail delivery failed. Retry scheduled.',
    attemptsExhausted: 'Mail delivery attempt limit reached.',
    retryPastDeadline: 'Mail delivery failed. The next retry would exceed the delivery deadline.',
} as const;
