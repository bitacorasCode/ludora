import 'server-only';

import { randomUUID } from 'node:crypto';

import { AUTH_ERROR_CODES, AUTH_NEXT_STEP } from '@ludora/contracts/auth';
import type { NextRequest } from 'next/server';

import { APP_ROUTES } from '@/config/routes';
import { EMAIL_VERIFICATION_QUERY_PARAMS } from '@/features/email-verification/config';
import { getPathname } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/resolve-locale';
import { type Locale, LOCALE_COOKIE_NAME, routing } from '@/i18n/routing';
import { type ActionError, OPERATION_STATUS } from '@/lib/actions';
import { HTTP_STATUS, publicApi } from '@/lib/api';
import { parseApiResponse } from '@/lib/api/parse-api-response';
import { createSession, deleteSession } from '@/lib/session';

import { SOCIAL_AUTH_QUERY_PARAMS } from '../config';
import { getSocialAuthErrorLocation } from '../locations';
import { SOCIAL_AUTH_ENDPOINTS } from './config';
import {
    createOAuthCallbackCookie,
    createOAuthRegistrationCookie,
    deleteOAuthCallbackCookie,
    deleteOAuthFlowCookie,
    deleteOAuthRegistrationCookie,
    getOAuthCallbackCookie,
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

function errorLocation(error: ActionError, locale: Locale) {
    return getPathname({ locale, href: getSocialAuthErrorLocation(error) });
}

export async function handleGoogleCallback(request: NextRequest): Promise<Response> {
    const flow = await getOAuthFlowCookie();
    const locale = flow?.locale ?? resolveLocale(
        request.cookies.get(LOCALE_COOKIE_NAME)?.value ?? routing.defaultLocale,
    );

    if (!flow || request.nextUrl.searchParams.get('state') !== flow.state) {
        return redirectResponse(errorLocation({ errorCode: AUTH_ERROR_CODES.oauthFlowInvalid }, locale));
    }

    const callbackId = randomUUID();
    const saved = await createOAuthCallbackCookie({
        id: callbackId,
        state: flow.state,
        responseParameters: request.nextUrl.searchParams.toString(),
    });

    if (!saved) {
        return redirectResponse(errorLocation({ errorCode: AUTH_ERROR_CODES.oauthFlowInvalid }, locale));
    }

    return redirectResponse(getPathname({
        locale,
        href: {
            pathname: APP_ROUTES.completeGoogleAuth,
            query: { [SOCIAL_AUTH_QUERY_PARAMS.callbackId]: callbackId },
        },
    }));
}

export async function completeGoogleCallback(callbackId: string, fallbackLocale: Locale): Promise<string> {
    const [flow, callback] = await Promise.all([getOAuthFlowCookie(), getOAuthCallbackCookie()]);
    const locale = flow?.locale ?? fallbackLocale;

    if (!flow || !callback || callback.id !== callbackId || callback.state !== flow.state) {
        return errorLocation({ errorCode: AUTH_ERROR_CODES.oauthFlowInvalid }, locale);
    }

    await deleteOAuthCallbackCookie();
    await deleteOAuthFlowCookie();

    const result = await publicApi.post(SOCIAL_AUTH_ENDPOINTS.googleCallback, {
        flowToken: flow.flowToken,
        responseParameters: callback.responseParameters,
    });
    const parsed = parseApiResponse(result, socialAuthCallbackResponseSchema);

    if (parsed.status === OPERATION_STATUS.error) {
        return errorLocation(parsed.error, locale);
    }

    const response = parsed.data;

    if (response.nextStep === AUTH_NEXT_STEP.authenticated) {
        await createSession(response);
        await deleteOAuthRegistrationCookie();

        return getPathname({ locale, href: APP_ROUTES.home });
    }

    await deleteSession();

    if (response.nextStep === AUTH_NEXT_STEP.verifyEmail) {
        await deleteOAuthRegistrationCookie();

        return getPathname({
            locale,
            href: {
                pathname: APP_ROUTES.verifyEmail,
                query: {
                    [EMAIL_VERIFICATION_QUERY_PARAMS.verificationId]: response.verification.id,
                    [EMAIL_VERIFICATION_QUERY_PARAMS.resendAvailableAt]: response.verification.resendAvailableAt,
                },
            },
        });
    }

    await createOAuthRegistrationCookie({ ...response.registration, locale });

    return getPathname({ locale, href: APP_ROUTES.completeRegistration });
}
