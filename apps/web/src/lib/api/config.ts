import 'server-only';

import { HEX_64_PATTERN } from '@ludora/security';
import { parseHttpUrl } from '@ludora/security/server';

export function getApiBaseUrl(): URL {
    const { API_URL, NODE_ENV } = process.env;

    if (!API_URL) {
        throw new Error('Missing API_URL environment variable.');
    }

    const baseUrl = parseHttpUrl(API_URL, NODE_ENV);

    if (!baseUrl) {
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
