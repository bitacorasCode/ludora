import { minutes, type ThrottlerOptions } from '@nestjs/throttler';

export const RATE_LIMIT_CONFIG = {
    ttl: minutes(1),
    limit: 60,
    blockDuration: minutes(1),
} satisfies ThrottlerOptions;