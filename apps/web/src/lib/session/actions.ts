'use server';

import { Buffer } from 'node:buffer';

import { AUTH_ERROR_CODES, SESSION_ACTIVITY_INTERVAL_SECONDS } from '@ludora/security';
import { z } from 'zod';

import { type ActionResult, isAuthenticationError, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, authenticatedApi, HTTP_STATUS, publicApi } from '@/lib/api';
import { fetchCurrentUser } from '@/lib/auth/get-current-user';
import { authResponseSchema } from '@/lib/auth/schemas';
import { MILLISECONDS_PER_SECOND } from '@/lib/time';

import { type RefreshSessionResult, SESSION_REFRESH_OUTCOME } from './refresh-result';
import { createSession, deleteSession, getRefreshToken, getSessionToken } from './session';

const ACTIVITY_ENDPOINT = '/auth/activity';
const REFRESH_ENDPOINT = '/auth/refresh';
const ACCESS_TOKEN_RENEWAL_WINDOW_MS =
    2 * SESSION_ACTIVITY_INTERVAL_SECONDS * MILLISECONDS_PER_SECOND;

const accessTokenPayloadSchema = z.object({ exp: z.int().positive() });

async function isAccessTokenDueForRenewal(): Promise<boolean> {
    const accessToken = await getSessionToken();
    const [, payload] = accessToken?.split('.') ?? [];

    if (!payload) return false;

    try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        const { data } = accessTokenPayloadSchema.safeParse(decoded);

        return data !== undefined
            && data.exp * MILLISECONDS_PER_SECOND - Date.now() <= ACCESS_TOKEN_RENEWAL_WINDOW_MS;
    } catch {
        return false;
    }
}

async function rotateSession(refreshToken: string): Promise<RefreshSessionResult> {
    const result = await publicApi.post(REFRESH_ENDPOINT, { refreshToken });

    if (result.status === OPERATION_STATUS.error) return result;

    const credentials = authResponseSchema.safeParse(result.data);

    if (!credentials.success) {
        return {
            status: OPERATION_STATUS.error,
            error: { errorCode: API_ERROR_CODES.invalidResponse },
        };
    }

    await createSession(credentials.data, { isRotation: true });

    return { status: OPERATION_STATUS.success, data: SESSION_REFRESH_OUTCOME.renewed };
}

export async function recordSessionActivity(): Promise<ActionResult> {
    const result = await authenticatedApi.post(ACTIVITY_ENDPOINT, undefined);

    if (result.status === OPERATION_STATUS.error) return result;

    // Nest has validated the access token. Its expiration only schedules renewal.
    if (await isAccessTokenDueForRenewal()) {
        const refreshToken = await getRefreshToken();

        // Keep the current credentials if early renewal fails.
        if (refreshToken) await rotateSession(refreshToken);
    }

    return { status: OPERATION_STATUS.success, data: null };
}

export async function refreshSession(): Promise<RefreshSessionResult> {
    const currentUser = await fetchCurrentUser();

    if (currentUser.status === OPERATION_STATUS.success) {
        return { status: OPERATION_STATUS.success, data: SESSION_REFRESH_OUTCOME.active };
    }

    if (!isAuthenticationError(currentUser.error)) {
        return currentUser;
    }

    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
        return { status: OPERATION_STATUS.success, data: SESSION_REFRESH_OUTCOME.ended };
    }

    const rotation = await rotateSession(refreshToken);

    if (
        rotation.status === OPERATION_STATUS.error
        && rotation.error.statusCode === HTTP_STATUS.unauthorized
        && rotation.error.errorCode === AUTH_ERROR_CODES.invalidToken
    ) {
        await deleteSession();

        return { status: OPERATION_STATUS.success, data: SESSION_REFRESH_OUTCOME.ended };
    }

    return rotation;
}
