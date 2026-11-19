import 'server-only';

import { cookies } from 'next/headers';
import { z } from 'zod';

import { NODE_ENVIRONMENT } from '@/config/environment';
import type { Locale } from '@/i18n/routing';

import { oauthFlowCookieSchema, oauthRegistrationCookieSchema } from './schemas';

const EXPIRED_COOKIE_MAX_AGE_SECONDS = 0;
const OAUTH_COOKIE_NAMES = {
    flow: {
        production: '__Host-ludora_oauth_flow',
        local: 'ludora_oauth_flow',
    },
    registration: {
        production: '__Host-ludora_oauth_registration',
        local: 'ludora_oauth_registration',
    },
} as const;

type CookieKind = keyof typeof OAUTH_COOKIE_NAMES;

function getCookieSettings(kind: CookieKind) {
    const secure = process.env.NODE_ENV === NODE_ENVIRONMENT.production;

    return {
        name: secure ? OAUTH_COOKIE_NAMES[kind].production : OAUTH_COOKIE_NAMES[kind].local,
        options: { httpOnly: true, secure, sameSite: 'lax', path: '/' } as const,
    };
}

async function readCookie<TSchema extends z.ZodType>(
    kind: CookieKind,
    schema: TSchema,
): Promise<z.output<TSchema> | null> {
    const cookieStore = await cookies();
    const raw = cookieStore.get(getCookieSettings(kind).name)?.value;

    if (!raw) return null;

    let data: unknown;

    try {
        data = JSON.parse(raw);
    } catch {
        return null;
    }

    const result = schema.safeParse(data);

    return result.success ? result.data : null;
}

async function writeCookie(kind: CookieKind, data: unknown, expiresAt: string) {
    const cookieStore = await cookies();
    const { name, options } = getCookieSettings(kind);

    cookieStore.set(name, JSON.stringify(data), {
        ...options,
        expires: new Date(expiresAt),
    });
}

async function deleteCookie(kind: CookieKind) {
    const cookieStore = await cookies();
    const { name, options } = getCookieSettings(kind);

    cookieStore.set(name, '', {
        ...options,
        maxAge: EXPIRED_COOKIE_MAX_AGE_SECONDS,
    });
}

export function createOAuthFlowCookie({
    expiresAt,
    ...data
}: z.infer<typeof oauthFlowCookieSchema> & { expiresAt: string }) {
    return writeCookie('flow', data, expiresAt);
}

export function getOAuthFlowCookie() {
    return readCookie('flow', oauthFlowCookieSchema);
}

export function deleteOAuthFlowCookie() {
    return deleteCookie('flow');
}

export function createOAuthRegistrationCookie({
    registrationToken,
    locale,
    expiresAt,
}: { registrationToken: string; locale: Locale; expiresAt: string }) {
    return writeCookie('registration', { registrationToken, locale }, expiresAt);
}

export function getOAuthRegistrationCookie() {
    return readCookie('registration', oauthRegistrationCookieSchema);
}

export function deleteOAuthRegistrationCookie() {
    return deleteCookie('registration');
}
