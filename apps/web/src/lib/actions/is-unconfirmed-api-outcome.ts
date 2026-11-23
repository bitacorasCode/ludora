import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api/constants';

import type { ActionError } from './types';

export function isUnconfirmedApiOutcome({ errorCode, statusCode }: ActionError): boolean {
    if (statusCode === undefined) {
        return errorCode === API_ERROR_CODES.unavailable
            || errorCode === API_ERROR_CODES.invalidResponse;
    }

    return statusCode >= HTTP_STATUS.internalServerError
        || (statusCode < HTTP_STATUS.badRequest && errorCode === API_ERROR_CODES.invalidResponse);
}
