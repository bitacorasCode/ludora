'use server';

import { getTranslations } from 'next-intl/server';

import { resolveLocale } from '@/i18n/resolve-locale';
import {
    type ActionResult,
    createValidationFailure,
    OPERATION_STATUS,
} from '@/lib/actions';
import { API_ERROR_CODES, publicApi } from '@/lib/api';
import { emailVerificationResponseSchema } from '@/lib/auth';
import { createRegisterSchema } from '@/lib/schemas';

const REGISTER_ENDPOINT = '/auth/register';

export type RegisterResult = ActionResult<{
    verificationId: string;
    emailSent: boolean;
    resendAvailableAt: string;
}>;

export async function registerUser(
    locale: string,
    formData: unknown,
): Promise<RegisterResult> {
    const validLocale = resolveLocale(locale);

    const t = await getTranslations({
        locale: validLocale,
        namespace: 'Register.validation',
    });

    const schema = createRegisterSchema(t);
    const validation = schema.safeParse(formData);

    if (!validation.success) {
        return createValidationFailure(validation.error.issues);
    }

    const { nickname, email, password } = validation.data;

    const result = await publicApi.post(REGISTER_ENDPOINT, {
        nickname,
        email,
        password,
    });

    if (result.status === OPERATION_STATUS.error) {
        return result;
    }

    const responseValidation = emailVerificationResponseSchema.safeParse(result.data);

    if (!responseValidation.success) {
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

    return {
        status: OPERATION_STATUS.success,
        data: {
            verificationId,
            emailSent,
            resendAvailableAt,
        },
    };
}
