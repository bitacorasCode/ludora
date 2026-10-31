import { minutes, type ThrottlerOptions } from '@nestjs/throttler';

const DEFAULT_RATE_LIMIT_WINDOW_MS = minutes(1);
const DEFAULT_RATE_LIMIT_REQUESTS = 60;
const DEFAULT_RATE_LIMIT_BLOCK_MS = minutes(1);

export const RATE_LIMIT_CONFIG = {
    ttl: DEFAULT_RATE_LIMIT_WINDOW_MS,
    limit: DEFAULT_RATE_LIMIT_REQUESTS,
    blockDuration: DEFAULT_RATE_LIMIT_BLOCK_MS,
} satisfies ThrottlerOptions;


export const AUTH_RATE_LIMIT_CONFIG = {
    login: {
        limit: 10,
        ttl: minutes(1),
        blockDuration: minutes(1),
    },
    register: {
        limit: 5,
        ttl: minutes(15),
        blockDuration: minutes(15),
    },
    verifyEmail: {
        limit: 10,
        ttl: minutes(1),
        blockDuration: minutes(1),
    },
    resendVerification: {
        limit: 5,
        ttl: minutes(15),
        blockDuration: minutes(15),
    },
} as const satisfies Record<string, ThrottlerOptions>;