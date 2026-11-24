import 'server-only';

import { randomUUID } from 'node:crypto';

import { HTTP_REQUEST_ID_HEADER } from '@ludora/contracts/http';
import { io } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';

import {
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';

import { getApiBaseUrl } from './config';
import {
    API_ERROR_CODES,
    API_METHOD,
    API_REQUEST_DEFAULTS,
    API_TIMEOUT_MS,
} from './constants';
import type { ApiOptions } from './types';

const apiErrorSchema = z.object({
    errorCode: z.string().min(1),
});

const apiRetryAfterSchema = z.object({
    retryAfterSeconds: z.number().int().positive(),
});

function resolveApiUrl(path: string): URL | null {
    const baseUrl = getApiBaseUrl();

    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
        return null;
    }

    const url = new URL(path, baseUrl);

    return url.origin === baseUrl.origin ? url : null;
}

export async function apiRequest(
    path: string,
    { timeoutMs = API_TIMEOUT_MS, ...options }: RequestInit & Pick<ApiOptions, 'timeoutMs'> = {},
): Promise<ActionResult<unknown>> {
    const url = resolveApiUrl(path);

    if (!url) {
        return {
            status: OPERATION_STATUS.error,
            error: { errorCode: API_ERROR_CODES.invalidRequest },
        };
    }

    const cache = options.cache ?? API_REQUEST_DEFAULTS.cache;
    const headers = new Headers(options.headers);
    let requestId: string | undefined;

    if (cache === API_REQUEST_DEFAULTS.cache) {
        await io();
        requestId = randomUUID();
        headers.set(HTTP_REQUEST_ID_HEADER, requestId);
    }

    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = options.signal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;

    const { pathname: route } = url;
    const startedAt = performance.now();
    let response: Response | undefined;
    let data: unknown;

    function logResponse(errorCode?: string) {
        console.info(JSON.stringify({
            service: 'web',
            event: 'dependency',
            dependency: 'nest',
            requestId,
            method: options.method ?? API_METHOD.get,
            route,
            statusCode: response?.status,
            durationMs: Math.round(performance.now() - startedAt),
            errorCode,
        }));
    }

    try {
        response = await fetch(url, {
            ...options,
            ...API_REQUEST_DEFAULTS,
            cache,
            headers,
            signal,
        });
        data = await response.json();
    } catch (error) {
        unstable_rethrow(error);
        const errorCode = response ? API_ERROR_CODES.invalidResponse : API_ERROR_CODES.unavailable;
        logResponse(errorCode);

        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode,
                ...(response && { statusCode: response.status }),
            },
        };
    }

    logResponse();

    if (!response.ok) {
        const parsedError = apiErrorSchema.safeParse(data);
        const parsedRetryAfter = apiRetryAfterSchema.safeParse(data);

        const errorCode = parsedError.success
            ? parsedError.data.errorCode
            : API_ERROR_CODES.requestFailed;

        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode,
                statusCode: response.status,
                ...(parsedRetryAfter.success ? parsedRetryAfter.data : {}),
            },
        };
    }

    return {
        status: OPERATION_STATUS.success,
        data
    };
}
