'use server';

import { getTranslations } from 'next-intl/server';

import { resolveLocale } from '@/i18n/resolve-locale';
import {
    type ActionResult,
    createValidationFailure,
    OPERATION_STATUS,
} from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS, publicApi } from '@/lib/api';
import { authResponseSchema, emailVerificationResponseSchema } from '@/lib/auth';
import { createEmailVerificationSchema } from '@/lib/schemas';
import { createSession } from '@/lib/session';
import { MILLISECONDS_PER_SECOND } from '@/lib/time';

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
    const validLocale = resolveLocale(locale);

    const t = await getTranslations({
        locale: validLocale,
        namespace: 'EmailVerification.validation',
    });

    const schema = createEmailVerificationSchema(t).pick({ verificationId: true });
    const validation = schema.safeParse(formData);

    if (!validation.success) {
        return createValidationFailure(validation.error.issues);
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
            const retryAt = new Date(Date.now() + retryAfterSeconds * MILLISECONDS_PER_SECOND);

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
        Math.ceil((Date.parse(resendAvailableAt) - Date.now()) / MILLISECONDS_PER_SECOND),
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
    const validLocale = resolveLocale(locale);

    const t = await getTranslations({
        locale: validLocale,
        namespace: 'EmailVerification.validation',
    });

    const schema = createEmailVerificationSchema(t);
    const validation = schema.safeParse(formData);

    if (!validation.success) {
        return createValidationFailure(validation.error.issues);
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
