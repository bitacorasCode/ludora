import { AUTH_ERROR_CODES, INTERNAL_REQUEST_HEADERS } from '@ludora/security';

export const API_TIMEOUT_MS = 10_000;
export const JSON_MEDIA_TYPE = 'application/json';

export const API_METHOD = {
    get: 'GET',
    post: 'POST',
    put: 'PUT',
} as const;

export const API_HEADERS = {
    accept: 'accept',
    contentType: 'content-type',
    authorization: 'authorization',
    cookie: 'cookie',
    host: 'host',
    proxyAuthorization: 'proxy-authorization',
} as const;

export const AUTHORIZATION_SCHEME = 'Bearer';

export const API_REQUEST_DEFAULTS = {
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
} as const satisfies Pick<RequestInit, 'cache' | 'credentials' | 'redirect'>;

export const API_RESERVED_HEADERS = [
    API_HEADERS.authorization,
    API_HEADERS.cookie,
    API_HEADERS.host,
    API_HEADERS.proxyAuthorization,
    ...Object.values(INTERNAL_REQUEST_HEADERS),
] as const;

export const VERCEL_REQUEST_HEADERS = {
    clientIp: 'x-vercel-forwarded-for',
} as const;

export const API_ERROR_CODES = {
    unavailable: 'API_UNAVAILABLE',
    invalidResponse: 'API_INVALID_RESPONSE',
    requestFailed: 'API_REQUEST_FAILED',
    invalidRequest: 'API_INVALID_REQUEST',
    authenticationRequired: AUTH_ERROR_CODES.authenticationRequired,
} as const;

export const HTTP_STATUS = {
    ok: 200,
    badRequest: 400,
    unauthorized: 401,
    tooManyRequests: 429,
    badGateway: 502,
    serviceUnavailable: 503,
} as const;