import 'server-only';

import { type ActionResult, OPERATION_STATUS } from '@/lib/actions';
import { getSessionToken } from '@/lib/auth';

import { apiRequest } from './api-request';
import {
    API_ERROR_CODES,
    API_METHOD,
    API_RESERVED_HEADERS,
    JSON_MEDIA_TYPE,
} from './constants';
import type { ApiClient, ApiOptions, PublicApiOptions } from './types';

function createApiClient<TOptions extends PublicApiOptions>(
    requiresAuthentication: boolean,
): ApiClient<TOptions> {
    async function request(
        method: (typeof API_METHOD)[keyof typeof API_METHOD],
        path: string,
        options: PublicApiOptions = {},
        body?: unknown,
    ): Promise<ActionResult<unknown>> {
        const headers = new Headers(options.headers);

        if (API_RESERVED_HEADERS.some((name) => headers.has(name))) {
            return {
                status: OPERATION_STATUS.error,
                error: { errorCode: API_ERROR_CODES.invalidRequest },
            };
        }

        headers.set('Accept', JSON_MEDIA_TYPE);

        let serializedBody: string | undefined;

        if (body) {
            try {
                serializedBody = JSON.stringify(body);
            } catch {
                return {
                    status: OPERATION_STATUS.error,
                    error: { errorCode: API_ERROR_CODES.invalidRequest },
                };
            }
        }

        if (serializedBody) {
            headers.set('Content-Type', JSON_MEDIA_TYPE);
        } else {
            headers.delete('Content-Type');
        }

        if (requiresAuthentication) {
            const accessToken = await getSessionToken();

            if (!accessToken) {
                return {
                    status: OPERATION_STATUS.error,
                    error: { errorCode: API_ERROR_CODES.authenticationRequired },
                };
            }

            headers.set('Authorization', `Bearer ${accessToken}`);
        }

        const cache = requiresAuthentication || method === API_METHOD.post
            ? 'no-store'
            : options.cache ?? 'no-store';

        return apiRequest(path, {
            method,
            headers,
            body: serializedBody,
            cache,
            signal: options.signal,
        });
    }

    return {
        get(path, options) {
            return request(API_METHOD.get, path, options);
        },
        post(path, body, options) {
            return request(API_METHOD.post, path, options, body);
        },
    };
}

export const publicApi = createApiClient<PublicApiOptions>(false);
export const authenticatedApi = createApiClient<ApiOptions>(true);
