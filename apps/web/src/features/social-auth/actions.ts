'use server';

import { AUTH_ERROR_CODES, AUTH_NEXT_STEP } from '@ludora/security';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { resolveLocale } from '@/i18n/resolve-locale';
import {
    type ActionResult,
    createValidationFailure,
    OPERATION_STATUS,
} from '@/lib/actions';
import { API_ERROR_CODES, publicApi } from '@/lib/api';
import { createSession } from '@/lib/session';

import { createSocialRegistrationSchema } from './schema';
import {
    createOAuthFlowCookie,
    deleteOAuthRegistrationCookie,
    getOAuthRegistrationCookie,
    googleAuthorizationResponseSchema,
    SOCIAL_AUTH_ENDPOINTS,
    socialRegistrationResponseSchema,
} from './server';

export async function startGoogleAuth(
    locale: string,
): Promise<ActionResult> {
    const validLocale = resolveLocale(locale);

    const result = await publicApi.post(
        SOCIAL_AUTH_ENDPOINTS.googleStart,
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

    const state = new URL(authorizationUrl).searchParams.get('state');

    if (!state) {
        return {
            status: OPERATION_STATUS.error,
            error: { errorCode: API_ERROR_CODES.invalidResponse },
        };
    }

    await createOAuthFlowCookie({
        flowToken,
        state,
        expiresAt,
        locale: validLocale,
    });

    await deleteOAuthRegistrationCookie();

    redirect(authorizationUrl);
}

export type CompleteSocialRegistrationResult = ActionResult<
    | { nextStep: typeof AUTH_NEXT_STEP.authenticated }
    | {
        nextStep: typeof AUTH_NEXT_STEP.verifyEmail;
        verificationId: string;
        emailSent: boolean;
        resendAvailableAt: string;
    }
>;

export async function completeSocialRegistration(
    locale: string,
    formData: unknown,
): Promise<CompleteSocialRegistrationResult> {
    const validLocale = resolveLocale(locale);
    const t = await getTranslations({ locale: validLocale, namespace: 'Register.validation' });
    const validation = createSocialRegistrationSchema(t, false).safeParse(formData);

    if (!validation.success) return createValidationFailure(validation.error.issues);

    const registration = await getOAuthRegistrationCookie();

    if (!registration) {
        return {
            status: OPERATION_STATUS.error,
            error: { errorCode: AUTH_ERROR_CODES.oauthRegistrationInvalid },
        };
    }

    const { nickname, email } = validation.data;
    const result = await publicApi.post(SOCIAL_AUTH_ENDPOINTS.completeRegistration, {
        registrationToken: registration.registrationToken,
        nickname,
        ...(email && { email }),
    });

    if (result.status === OPERATION_STATUS.error) {
        if (
            result.error.errorCode === AUTH_ERROR_CODES.oauthRegistrationInvalid
            || result.error.errorCode === AUTH_ERROR_CODES.oauthIdentityAlreadyLinked
        ) {
            await deleteOAuthRegistrationCookie();
        }

        return result;
    }

    const response = socialRegistrationResponseSchema.safeParse(result.data);

    if (!response.success) {
        return {
            status: OPERATION_STATUS.error,
            error: { errorCode: API_ERROR_CODES.invalidResponse },
        };
    }

    await deleteOAuthRegistrationCookie();

    if (response.data.nextStep === AUTH_NEXT_STEP.authenticated) {
        await createSession(response.data);

        return {
            status: OPERATION_STATUS.success,
            data: { nextStep: AUTH_NEXT_STEP.authenticated },
        };
    }

    const { id: verificationId, emailSent, resendAvailableAt } = response.data.verification;

    return {
        status: OPERATION_STATUS.success,
        data: { nextStep: AUTH_NEXT_STEP.verifyEmail, verificationId, emailSent, resendAvailableAt },
    };
}
