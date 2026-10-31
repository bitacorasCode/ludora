import 'server-only';

import { ACCESS_TOKEN_TTL_SECONDS } from '@ludora/security';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'ludora_session';

export async function createSession(accessToken: string): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ACCESS_TOKEN_TTL_SECONDS,
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
