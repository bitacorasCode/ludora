import 'server-only';

import { AUTH_ERROR_CODES, AUTH_NEXT_STEP } from '@ludora/security';
import type { NextRequest } from 'next/server';

import { APP_ROUTES } from '@/config/routes';
import { EMAIL_VERIFICATION_QUERY_PARAMS } from '@/features/email-verification/config';
import { getPathname } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/resolve-locale';
import { type Locale, LOCALE_COOKIE_NAME, routing } from '@/i18n/routing';
import { type ActionError, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS, publicApi } from '@/lib/api';
import { createSession, deleteSession } from '@/lib/session';

import { getSocialAuthErrorLocation } from '../locations';
import { SOCIAL_AUTH_ENDPOINTS } from './config';
import {
    createOAuthRegistrationCookie,
    deleteOAuthFlowCookie,
    deleteOAuthRegistrationCookie,
    getOAuthFlowCookie,
} from './cookies';
import { socialAuthCallbackResponseSchema } from './schemas';

const CALLBACK_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
} as const;

function redirectResponse(location: string) {
    return new Response(null, {
        status: HTTP_STATUS.seeOther,
        headers: { ...CALLBACK_RESPONSE_HEADERS, Location: location },
    });
}

function errorResponse(error: ActionError, locale: Locale) {
    return redirectResponse(getPathname({ locale, href: getSocialAuthErrorLocation(error) }));
}

export async function handleGoogleCallback(request: NextRequest): Promise<Response> {
    const flow = await getOAuthFlowCookie();
    const locale = flow?.locale ?? resolveLocale(
        request.cookies.get(LOCALE_COOKIE_NAME)?.value ?? routing.defaultLocale,
    );

    if (!flow || request.nextUrl.searchParams.get('state') !== flow.state) {
        return errorResponse({ errorCode: AUTH_ERROR_CODES.oauthFlowInvalid }, locale);
    }

    await deleteOAuthFlowCookie();

    const result = await publicApi.post(SOCIAL_AUTH_ENDPOINTS.googleCallback, {
        flowToken: flow.flowToken,
        responseParameters: request.nextUrl.searchParams.toString(),
    }, { signal: request.signal });

    if (result.status === OPERATION_STATUS.error) {
        return errorResponse(result.error, locale);
    }

    const validation = socialAuthCallbackResponseSchema.safeParse(result.data);

    if (!validation.success) {
        return errorResponse({ errorCode: API_ERROR_CODES.invalidResponse }, locale);
    }

    const response = validation.data;

    if (response.nextStep === AUTH_NEXT_STEP.authenticated) {
        await createSession(response.accessToken);
        await deleteOAuthRegistrationCookie();

        return redirectResponse(getPathname({ locale, href: APP_ROUTES.home }));
    }

    await deleteSession();

    if (response.nextStep === AUTH_NEXT_STEP.verifyEmail) {
        await deleteOAuthRegistrationCookie();

        return redirectResponse(getPathname({
            locale,
            href: {
                pathname: APP_ROUTES.verifyEmail,
                query: {
                    [EMAIL_VERIFICATION_QUERY_PARAMS.verificationId]: response.verification.id,
                    [EMAIL_VERIFICATION_QUERY_PARAMS.resendAvailableAt]: response.verification.resendAvailableAt,
                },
            },
        }));
    }

    await createOAuthRegistrationCookie({ ...response.registration, locale });

    return redirectResponse(getPathname({ locale, href: APP_ROUTES.completeRegistration }));
}
