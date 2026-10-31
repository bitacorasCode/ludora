import 'server-only';

import { ACCESS_TOKEN_TTL_SECONDS } from '@ludora/security';
import { cookies } from 'next/headers';

import { NODE_ENVIRONMENT } from '@/config/environment';

const SESSION_COOKIE_NAME = 'ludora_session';
const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
} as const;

export async function createSession(accessToken: string): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, accessToken, {
        ...SESSION_COOKIE_OPTIONS,
        secure: process.env.NODE_ENV === NODE_ENVIRONMENT.production,
    });
}

export async function getSessionToken(): Promise<string | undefined> {
    const cookieStore = await cookies();

    return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function deleteSession(): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.delete(SESSION_COOKIE_NAME);
}
