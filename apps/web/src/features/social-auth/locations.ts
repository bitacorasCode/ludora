import { z } from 'zod';

import { APP_ROUTES } from '@/config/routes';
import type { ActionError } from '@/lib/actions';
import { HTTP_STATUS } from '@/lib/api/constants';

import { SOCIAL_AUTH_QUERY_PARAMS } from './config';

type SearchParams = Record<string, string | string[] | undefined>;

const errorCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]+$/);

export function getSocialAuthErrorLocation(error: ActionError) {
    return {
        pathname: APP_ROUTES.login,
        query: {
            [SOCIAL_AUTH_QUERY_PARAMS.error]: error.errorCode,
            ...(error.statusCode === HTTP_STATUS.tooManyRequests && {
                [SOCIAL_AUTH_QUERY_PARAMS.statusCode]: String(error.statusCode),
                ...(error.retryAfterSeconds !== undefined && {
                    [SOCIAL_AUTH_QUERY_PARAMS.retryAfterSeconds]: String(error.retryAfterSeconds),
                }),
            }),
        },
    };
}

export function getSocialAuthCallbackError(params: SearchParams): ActionError | null {
    const code = errorCodeSchema.safeParse(params[SOCIAL_AUTH_QUERY_PARAMS.error]);

    if (!code.success) return null;

    const seconds = z.coerce.number().int().positive().safeParse(
        params[SOCIAL_AUTH_QUERY_PARAMS.retryAfterSeconds],
    );
    const isRateLimited =
        params[SOCIAL_AUTH_QUERY_PARAMS.statusCode] === String(HTTP_STATUS.tooManyRequests);

    return {
        errorCode: code.data,
        ...(isRateLimited && {
            statusCode: HTTP_STATUS.tooManyRequests,
            ...(seconds.success && { retryAfterSeconds: seconds.data }),
        }),
    };
}
