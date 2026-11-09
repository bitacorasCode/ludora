import {
    API_ERROR_CODES,
    HTTP_STATUS,
} from '@/lib/api/constants';

import type { ActionError } from './types';

export function isAuthenticationError(
    error: ActionError | null | undefined,
): boolean {
    return (
        error?.errorCode === API_ERROR_CODES.authenticationRequired
        || error?.statusCode === HTTP_STATUS.unauthorized
    );
}