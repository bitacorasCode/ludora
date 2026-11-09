import { NextResponse } from 'next/server';

import { profileApi } from '@/features/profile/server/profile-api';
import {
    type ActionError,
    OPERATION_STATUS,
} from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api';

const MAX_HTTP_ERROR_STATUS = 599;

const PROFILE_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store',
} as const;

const PROFILE_ERROR_HTTP_STATUS: Partial<Record<string, number>> = {
    [API_ERROR_CODES.authenticationRequired]: HTTP_STATUS.unauthorized,
    [API_ERROR_CODES.unavailable]: HTTP_STATUS.serviceUnavailable,
};

function getErrorStatus({ errorCode, statusCode }: ActionError): number {
    if (
        statusCode !== undefined
        && statusCode >= HTTP_STATUS.badRequest
        && statusCode <= MAX_HTTP_ERROR_STATUS
    ) {
        return statusCode;
    }

    return PROFILE_ERROR_HTTP_STATUS[errorCode]
        ?? HTTP_STATUS.badGateway;
}

export async function GET(request: Request) {
    const result = await profileApi.get({
        signal: request.signal,
    });

    const status = result.status === OPERATION_STATUS.success
        ? HTTP_STATUS.ok
        : getErrorStatus(result.error);

    return NextResponse.json(result, {
        status,
        headers: PROFILE_RESPONSE_HEADERS,
    });
}