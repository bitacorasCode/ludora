import type { ApiErrorDefinition } from '../types/api-error-definition.js';

export const DATABASE_ERRORS = {
    uniqueConstraintViolation: {
        errorCode: 'DATABASE_UNIQUE_CONSTRAINT_VIOLATION',
        message: 'A record with these values already exists.',
    },
} as const satisfies Record<string, ApiErrorDefinition>;

export const RATE_LIMIT_ERRORS = {
    clientIpUnavailable: {
        errorCode: 'RATE_LIMIT_CLIENT_IP_UNAVAILABLE',
        message: 'Could not determine the client IP address.',
    },
    exceeded: {
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
    },
} as const satisfies Record<string, ApiErrorDefinition>;

export const HTTP_ERROR_NAMES = {
    conflict: 'Conflict',
    tooManyRequests: 'Too Many Requests',
} as const;
