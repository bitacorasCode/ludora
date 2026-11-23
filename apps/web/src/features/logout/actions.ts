'use server';

import { z } from 'zod';

import { APP_ROUTES } from '@/config/routes';
import { redirect } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/resolve-locale';
import { type ActionResult, isAuthenticationError, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, authenticatedApi, publicApi } from '@/lib/api';
import { deleteSession, getRefreshToken } from '@/lib/session';

const LOGOUT_ENDPOINT = '/auth/logout';
const LOGOUT_CURRENT_SESSION_ENDPOINT = '/auth/logout/current';
const logoutResponseSchema = z.object({ loggedOut: z.literal(true) });

export async function logoutUser(locale: string): Promise<ActionResult> {
    const validLocale = resolveLocale(locale);
    const refreshToken = await getRefreshToken();

    const result = refreshToken
        ? await publicApi.post(LOGOUT_ENDPOINT, { refreshToken })
        : await authenticatedApi.post(LOGOUT_CURRENT_SESSION_ENDPOINT, undefined);

    if (result.status === OPERATION_STATUS.error) {
        if (refreshToken || !isAuthenticationError(result.error)) return result;
    } else if (!logoutResponseSchema.safeParse(result.data).success) {
        return {
            status: OPERATION_STATUS.error,
            error: { errorCode: API_ERROR_CODES.invalidResponse },
        };
    }

    await deleteSession();

    return redirect({ href: APP_ROUTES.home, locale: validLocale });
}
