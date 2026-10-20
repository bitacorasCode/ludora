import 'server-only';

import { z } from 'zod';

import {
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';

import { API_ERROR_CODES, API_TIMEOUT_MS } from './constants';

const apiErrorSchema = z.object({
    errorCode: z.string().min(1),
});

function resolveApiUrl(path: string): URL | null {
    const { API_URL } = process.env;

    if (!API_URL) {
        throw new Error('Missing API_URL environment variable.');
    }

    const baseUrl = new URL(API_URL);

    if (
        !['http:', 'https:'].includes(baseUrl.protocol)
        || baseUrl.username
        || baseUrl.password
    ) {
        throw new Error('API_URL must be an HTTP(S) URL without credentials.');
    }

    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
        return null;
    }

    const url = new URL(path, baseUrl);

    return url.origin === baseUrl.origin ? url : null;
}

export async function apiRequest(
    path: string,
    options: RequestInit = {},
): Promise<ActionResult<unknown>> {
    const url = resolveApiUrl(path);

    if (!url) {
        return {
            status: OPERATION_STATUS.error,
            error: { errorCode: API_ERROR_CODES.invalidRequest },
        };
    }

    const timeoutSignal = AbortSignal.timeout(API_TIMEOUT_MS);
    const signal = options.signal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;

    let response: Response;

    try {
        response = await fetch(url, {
            ...options,
            cache: options.cache ?? 'no-store',
            signal,
            credentials: 'omit',
            redirect: 'error',
        });
    } catch {
        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode: API_ERROR_CODES.unavailable,
            },
        };
    }

    let data: unknown;

    try {
        data = await response.json();
    } catch {
        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode: API_ERROR_CODES.invalidResponse,
                statusCode: response.status,
            },
        };
    }

    if (!response.ok) {
        const parsedError = apiErrorSchema.safeParse(data);

        const errorCode = parsedError.success
            ? parsedError.data.errorCode
            : API_ERROR_CODES.requestFailed;

        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode,
                statusCode: response.status,
            },
        };
    }

    return {
        status: OPERATION_STATUS.success,
        data
    };
}
