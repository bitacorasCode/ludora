import 'server-only';

import { cookies } from 'next/headers';

import { NODE_ENVIRONMENT } from '@/config/environment';
import type { Locale } from '@/i18n/routing';

const OAUTH_FLOW_COOKIE_NAMES = {
    production: '__Host-ludora_oauth_flow',
    local: 'ludora_oauth_flow',
} as const;

type OAuthFlowCookieInput = {
    flowToken: string;
    expiresAt: string;
    locale: Locale;
};

export async function createOAuthFlowCookie({
    flowToken,
    expiresAt,
    locale,
}: OAuthFlowCookieInput): Promise<void> {
    const cookieStore = await cookies();

    const isProduction =
        process.env.NODE_ENV === NODE_ENVIRONMENT.production;

    const cookieName = isProduction
        ? OAUTH_FLOW_COOKIE_NAMES.production
        : OAUTH_FLOW_COOKIE_NAMES.local;

    cookieStore.set(
        cookieName,
        JSON.stringify({ flowToken, locale }),
        {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/',
            expires: new Date(expiresAt),
        },
    );
}