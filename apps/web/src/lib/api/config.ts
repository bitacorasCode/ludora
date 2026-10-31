import 'server-only';

import { HEX_64_PATTERN } from '@ludora/security';

import { NODE_ENVIRONMENT } from '@/config/environment';

const LOCAL_API_HOSTS = ['localhost', '127.0.0.1', '[::1]'] as const;
const HTTP_PROTOCOL = {
    secure: 'https:',
    insecure: 'http:',
} as const;

export function getApiBaseUrl(): URL {
    const { API_URL, NODE_ENV } = process.env;

    if (!API_URL) {
        throw new Error('Missing API_URL environment variable.');
    }

    const baseUrl = new URL(API_URL);
    const isHttps = baseUrl.protocol === HTTP_PROTOCOL.secure;
    const isLocalHttp =
        (NODE_ENV === NODE_ENVIRONMENT.development || NODE_ENV === NODE_ENVIRONMENT.test) &&
        baseUrl.protocol === HTTP_PROTOCOL.insecure &&
        LOCAL_API_HOSTS.some((hostname) => hostname === baseUrl.hostname);

    if ((!isHttps && !isLocalHttp) || baseUrl.username || baseUrl.password) {
        throw new Error(
            'API_URL must use HTTPS without credentials. HTTP is only allowed for loopback hosts in development or tests.',
        );
    }

    return baseUrl;
}

export function getInternalApiSecret(): string {
    const { INTERNAL_API_SECRET } = process.env;

    if (
        !INTERNAL_API_SECRET
        || !HEX_64_PATTERN.test(INTERNAL_API_SECRET)
    ) {
        throw new Error(
            'INTERNAL_API_SECRET must contain 64 hexadecimal characters.',
        );
    }

    return INTERNAL_API_SECRET;
}
