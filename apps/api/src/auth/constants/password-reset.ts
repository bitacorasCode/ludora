import { SECONDS_PER_MINUTE } from '../../common/constants/index.js';

export const PASSWORD_RESET_CONFIG = {
    expiresInSeconds: 30 * SECONDS_PER_MINUTE,
    requestCooldownSeconds: SECONDS_PER_MINUTE,
} as const;
