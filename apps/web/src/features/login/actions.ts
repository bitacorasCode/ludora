'use server';

import { getTranslations } from 'next-intl/server';

import { resolveLocale } from '@/i18n/resolve-locale';
import {
    ACTION_ERROR_CODES,
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';
import { API_ERROR_CODES, publicApi } from '@/lib/api';
import { AUTH_NEXT_STEP, loginResponseSchema } from '@/lib/auth';
import { createLoginSchema } from '@/lib/schemas';
import { createSession } from '@/lib/session';

const LOGIN_ENDPOINT = '/auth/login';

export type LoginResult = ActionResult<{
    verificationId: string;
    resendAvailableAt: string;
} | null>;

export async function loginUser(
    locale: string,
    formData: unknown,
): Promise<LoginResult> {
    const validLocale = resolveLocale(locale);

    const t = await getTranslations({
        locale: validLocale,
        namespace: 'Login.validation',
    });

    const schema = createLoginSchema(t);
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

    const result = await publicApi.post(LOGIN_ENDPOINT, validation.data);

    if (result.status === OPERATION_STATUS.error) {
        return result;
    }

    const responseValidation = loginResponseSchema.safeParse(result.data);

    if (!responseValidation.success) {
        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode: API_ERROR_CODES.invalidResponse,
            },
        };
    }

    const response = responseValidation.data;

    if (response.nextStep === AUTH_NEXT_STEP.verifyEmail) {
        const { id: verificationId, resendAvailableAt } = response.verification;

        return {
            status: OPERATION_STATUS.success,
            data: { verificationId, resendAvailableAt },
        };
    }

    const { accessToken } = response;

    await createSession(accessToken);

    return {
        status: OPERATION_STATUS.success,
        data: null,
    };
}
