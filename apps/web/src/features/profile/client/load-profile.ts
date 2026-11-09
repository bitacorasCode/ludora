'use client';

import {
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';
import {
    API_ERROR_CODES,
    API_REQUEST_DEFAULTS,
} from '@/lib/api/constants';

import {
    profileLoadResultSchema,
    type ProfileResponse,
} from '../schema';

const PROFILE_READ_ROUTE = '/api/profile';

const PROFILE_REQUEST_OPTIONS = {
    cache: API_REQUEST_DEFAULTS.cache,
    credentials: 'same-origin',
} as const satisfies Pick<RequestInit, 'cache' | 'credentials'>;

export async function loadProfile(
    signal?: AbortSignal,
): Promise<ActionResult<ProfileResponse>> {
    let response: Response;

    try {
        response = await fetch(PROFILE_READ_ROUTE, {
            ...PROFILE_REQUEST_OPTIONS,
            signal,
        });
    } catch {
        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode: API_ERROR_CODES.unavailable,
            },
        };
    }

    const body: unknown = await response.json().catch(() => null);
    const validation = profileLoadResultSchema.safeParse(body);

    if (
        !validation.success
        || (
            !response.ok
            && validation.data.status === OPERATION_STATUS.success
        )
    ) {
        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode: API_ERROR_CODES.invalidResponse,
                statusCode: response.status,
            },
        };
    }

    const result = validation.data;

    if (result.status === OPERATION_STATUS.error) {
        return {
            status: OPERATION_STATUS.error,
            error: {
                ...result.error,
                statusCode: response.status,
            },
        };
    }

    return result;
}