'use server';

import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import {
    ACTION_ERROR_CODES,
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS, publicApi } from '@/lib/api';
import { authResponseSchema, emailVerificationResponseSchema } from '@/lib/auth';
import { createEmailVerificationSchema } from '@/lib/schemas';
import { createSession } from '@/lib/session';

const VERIFY_EMAIL_ENDPOINT = '/auth/verify-email';
const RESEND_VERIFICATION_ENDPOINT = '/auth/resend-verification';

export type ResendVerificationResult = ActionResult<{
    verificationId: string;
    emailSent: boolean;
    resendAvailableAt: string;
    retryAfterSeconds: number;
}>;

export async function resendVerification(
    locale: string,
    formData: unknown,
): Promise<ResendVerificationResult> {
    const validLocale = hasLocale(routing.locales, locale)
        ? locale
        : routing.defaultLocale;

    const t = await getTranslations({
        locale: validLocale,
        namespace: 'EmailVerification.validation',
    });

    const schema = createEmailVerificationSchema(t).pick({ verificationId: true });
    const validation = schema.safeParse(formData);

    if (!validation.success) {
        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode: ACTION_ERROR_CODES.validationFailed,
                validationErrors: validation.error.issues.map(
                    ({ message }) => message,
                ),
            },
        };
    }

    const result = await publicApi.post(
        RESEND_VERIFICATION_ENDPOINT,
        validation.data,
    );

    if (result.status === OPERATION_STATUS.error) {
        const { retryAfterSeconds, statusCode } = result.error;

        if (
            statusCode === HTTP_STATUS.tooManyRequests
            && typeof retryAfterSeconds === 'number'
            && Number.isInteger(retryAfterSeconds)
            && retryAfterSeconds > 0
        ) {
            const retryAt = new Date(Date.now() + retryAfterSeconds * 1_000);

            if (Number.isFinite(retryAt.getTime())) {
                return {
                    ...result,
                    error: {
                        ...result.error,
                        retryAt: retryAt.toISOString(),
                    },
                };
            }
        }

        return result;
    }

    const responseValidation = emailVerificationResponseSchema.safeParse(result.data);

    if (
        !responseValidation.success
        || responseValidation.data.verification.id !== validation.data.verificationId
    ) {
        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode: API_ERROR_CODES.invalidResponse,
            },
        };
    }

    const {
        verification: { id: verificationId, emailSent, resendAvailableAt },
    } = responseValidation.data;

    const retryAfterSeconds = Math.max(
        0,
        Math.ceil((Date.parse(resendAvailableAt) - Date.now()) / 1_000),
    );

    return {
        status: OPERATION_STATUS.success,
        data: {
            verificationId,
            emailSent,
            resendAvailableAt,
            retryAfterSeconds,
        },
    };
}

export async function verifyEmail(
    locale: string,
    formData: unknown,
): Promise<ActionResult> {
    const validLocale = hasLocale(routing.locales, locale)
        ? locale
        : routing.defaultLocale;

    const t = await getTranslations({
        locale: validLocale,
        namespace: 'EmailVerification.validation',
    });

    const schema = createEmailVerificationSchema(t);
    const validation = schema.safeParse(formData);

    if (!validation.success) {
        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode: ACTION_ERROR_CODES.validationFailed,
                validationErrors: validation.error.issues.map(
                    ({ message }) => message,
                ),
            },
        };
    }

    const result = await publicApi.post(
        VERIFY_EMAIL_ENDPOINT,
        validation.data,
    );

    if (result.status === OPERATION_STATUS.error) {
        return result;
    }

    const responseValidation = authResponseSchema.safeParse(result.data);

    if (!responseValidation.success) {
        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode: API_ERROR_CODES.invalidResponse,
            },
        };
    }

    const { accessToken } = responseValidation.data;

    await createSession(accessToken);

    return {
        status: OPERATION_STATUS.success,
        data: null,
    };
}
