import 'server-only';

import { INTERNAL_REQUEST_HEADERS } from '@ludora/security';

import { type ActionResult, OPERATION_STATUS } from '@/lib/actions';
import { getSessionToken } from '@/lib/session';

import { apiRequest } from './api-request';
import { getInternalApiSecret } from './config';
import {
    API_ERROR_CODES,
    API_HEADERS,
    API_METHOD,
    API_REQUEST_DEFAULTS,
    API_RESERVED_HEADERS,
    AUTHORIZATION_SCHEME,
    JSON_MEDIA_TYPE,
} from './constants';
import { getClientIp } from './get-client-ip';
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

        headers.set(API_HEADERS.accept, JSON_MEDIA_TYPE);

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
            headers.set(API_HEADERS.contentType, JSON_MEDIA_TYPE);
        } else {
            headers.delete(API_HEADERS.contentType);
        }

        if (requiresAuthentication) {
            const accessToken = await getSessionToken();

            if (!accessToken) {
                return {
                    status: OPERATION_STATUS.error,
                    error: { errorCode: API_ERROR_CODES.authenticationRequired },
                };
            }

            headers.set(
                API_HEADERS.authorization,
                `${AUTHORIZATION_SCHEME} ${accessToken}`,
            );
        }

        headers.set(
            INTERNAL_REQUEST_HEADERS.secret,
            getInternalApiSecret(),
        );

        const usesVisitorContext =
            requiresAuthentication || method !== API_METHOD.get;

        if (usesVisitorContext) {
            const clientIp = await getClientIp();

            if (clientIp) {
                headers.set(
                    INTERNAL_REQUEST_HEADERS.clientIp,
                    clientIp,
                );
            }
        }

        const cache = usesVisitorContext
            ? API_REQUEST_DEFAULTS.cache
            : options.cache ?? API_REQUEST_DEFAULTS.cache;
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
        put(path, body, options) {
            return request(API_METHOD.put, path, options, body);
        },
    };
}

export const publicApi = createApiClient<PublicApiOptions>(false);
export const authenticatedApi = createApiClient<ApiOptions>(true);
