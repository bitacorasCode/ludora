export const API_TIMEOUT_MS = 10_000;
export const JSON_MEDIA_TYPE = 'application/json';

export const API_METHOD = {
    get: 'GET',
    post: 'POST',
} as const;

export const API_RESERVED_HEADERS = [
    'authorization',
    'cookie',
    'host',
    'proxy-authorization',
] as const;

export const API_ERROR_CODES = {
    unavailable: 'API_UNAVAILABLE',
    invalidResponse: 'API_INVALID_RESPONSE',
    requestFailed: 'API_REQUEST_FAILED',
    invalidRequest: 'API_INVALID_REQUEST',
    authenticationRequired: 'AUTHENTICATION_REQUIRED',
} as const;
