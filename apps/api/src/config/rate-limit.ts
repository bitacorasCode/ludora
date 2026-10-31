import { minutes, type ThrottlerOptions } from '@nestjs/throttler';

const DEFAULT_RATE_LIMIT_WINDOW_MS = minutes(1);
const DEFAULT_RATE_LIMIT_REQUESTS = 60;
const DEFAULT_RATE_LIMIT_BLOCK_MS = minutes(1);

export const RATE_LIMIT_CONFIG = {
    ttl: DEFAULT_RATE_LIMIT_WINDOW_MS,
    limit: DEFAULT_RATE_LIMIT_REQUESTS,
    blockDuration: DEFAULT_RATE_LIMIT_BLOCK_MS,
} satisfies ThrottlerOptions;
