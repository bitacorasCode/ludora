import type { ApiErrorDefinition } from '../types/api-error-definition.js';

export const DATABASE_ERRORS = {
    uniqueConstraintViolation: {
        errorCode: 'DATABASE_UNIQUE_CONSTRAINT_VIOLATION',
        message: 'A record with these values already exists.',
    },
} as const satisfies Record<string, ApiErrorDefinition>;
