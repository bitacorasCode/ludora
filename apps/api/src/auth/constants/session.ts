import { SECONDS_PER_DAY } from '../../common/constants/time.js';

export const SESSION_CONFIG = {
    idleTimeoutSeconds: 7 * SECONDS_PER_DAY,
    absoluteTimeoutSeconds: 30 * SECONDS_PER_DAY,
    refreshReuseGraceSeconds: 5,
} as const;
