import 'server-only';

import { randomUUID } from 'node:crypto';

import { ACCESS_TOKEN_TTL_SECONDS } from '@ludora/security';
import { cookies } from 'next/headers';

import { NODE_ENVIRONMENT } from '@/config/environment';
import type { SessionCredentials } from '@/lib/auth/schemas';

import { SESSION_REVISION_COOKIE_NAME } from './constants';

const IS_PRODUCTION = process.env.NODE_ENV === NODE_ENVIRONMENT.production;
const SESSION_COOKIE_NAME = 'ludora_session';
const REFRESH_TOKEN_COOKIE_NAME = IS_PRODUCTION
    ? '__Host-ludora_refresh'
    : 'ludora_refresh';
const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: IS_PRODUCTION,
} as const;

function updateSessionRevision(cookieStore: Awaited<ReturnType<typeof cookies>>) {
    // This value signals a session change. It carries no credentials.
    cookieStore.set(SESSION_REVISION_COOKIE_NAME, randomUUID(), {
        ...SESSION_COOKIE_OPTIONS,
        httpOnly: false,
    });
}

export async function createSession(
    { accessToken, refreshToken, absoluteExpiresAt }: SessionCredentials,
    { isRotation = false } = {},
): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, accessToken, {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: ACCESS_TOKEN_TTL_SECONDS,
    });
    cookieStore.set(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
        ...SESSION_COOKIE_OPTIONS,
        expires: new Date(absoluteExpiresAt),
    });

    if (!isRotation) updateSessionRevision(cookieStore);
}

export async function getSessionToken(): Promise<string | undefined> {
    const cookieStore = await cookies();

    return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
    const cookieStore = await cookies();

    return cookieStore.get(REFRESH_TOKEN_COOKIE_NAME)?.value;
}

export async function getSessionRevision(): Promise<string | null> {
    const cookieStore = await cookies();

    return cookieStore.get(SESSION_REVISION_COOKIE_NAME)?.value ?? null;
}

export async function deleteSession(): Promise<void> {
    const cookieStore = await cookies();

    for (const name of [SESSION_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME]) {
        cookieStore.set(name, '', { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
    }

    updateSessionRevision(cookieStore);
}
