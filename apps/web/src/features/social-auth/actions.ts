'use server';

import { redirect } from 'next/navigation';

import { resolveLocale } from '@/i18n/resolve-locale';
import {
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';
import { API_ERROR_CODES, publicApi } from '@/lib/api';

import {
    createOAuthFlowCookie,
    googleAuthorizationResponseSchema,
} from './server';

const GOOGLE_START_ENDPOINT = '/auth/google/start';

export async function startGoogleAuth(
    locale: string,
): Promise<ActionResult> {
    const validLocale = resolveLocale(locale);

    const result = await publicApi.post(
        GOOGLE_START_ENDPOINT,
        {},
    );

    if (result.status === OPERATION_STATUS.error) {
        return result;
    }

    const validation =
        googleAuthorizationResponseSchema.safeParse(result.data);

    if (!validation.success) {
        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode: API_ERROR_CODES.invalidResponse,
            },
        };
    }

    const {
        authorizationUrl,
        flowToken,
        expiresAt,
    } = validation.data;

    await createOAuthFlowCookie({
        flowToken,
        expiresAt,
        locale: validLocale,
    });

    redirect(authorizationUrl);
}