'use server';

import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import {
    ACTION_ERROR_CODES,
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';
import { API_ERROR_CODES, publicApi } from '@/lib/api';
import { authResponseSchema } from '@/lib/auth';
import { createEmailVerificationSchema } from '@/lib/schemas';
import { createSession } from '@/lib/session';

const VERIFY_EMAIL_ENDPOINT = '/auth/verify-email';

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
