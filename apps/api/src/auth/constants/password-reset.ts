import { MILLISECONDS_PER_SECOND, SECONDS_PER_MINUTE } from '../../common/constants/index.js';
import { AUTH_MAIL_QUEUE } from './mail-queue.js';

export const PASSWORD_RESET_CONFIG = {
    expiresInSeconds: 30 * SECONDS_PER_MINUTE,
    requestCooldownSeconds: SECONDS_PER_MINUTE,
} as const;

export const PASSWORD_RECOVERY_QUEUE = {
    ...AUTH_MAIL_QUEUE,
    maxAgeMs: PASSWORD_RESET_CONFIG.expiresInSeconds * MILLISECONDS_PER_SECOND,
} as const;
