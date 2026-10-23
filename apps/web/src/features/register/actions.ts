'use server';

import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { routing } from '@/i18n/routing';
import {
    ACTION_ERROR_CODES,
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';
import { API_ERROR_CODES, publicApi } from '@/lib/api';
import { createRegisterSchema } from '@/lib/schemas';

const REGISTER_ENDPOINT = '/auth/register';

const registerResponseSchema = z.object({
    verification: z.object({
        id: z.uuid(),
        emailSent: z.boolean(),
    }),
});

export type RegisterResult = ActionResult<{
    verificationId: string;
    emailSent: boolean;
}>;

export async function registerUser(
    locale: string,
    formData: unknown,
): Promise<RegisterResult> {
    const validLocale = hasLocale(routing.locales, locale)
        ? locale
        : routing.defaultLocale;

    const t = await getTranslations({
        locale: validLocale,
        namespace: 'Register.validation',
    });

    const schema = createRegisterSchema(t);
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

    const { nickname, email, password } = validation.data;

    const result = await publicApi.post(REGISTER_ENDPOINT, {
        nickname,
        email,
        password,
    });

    if (result.status === OPERATION_STATUS.error) {
        return result;
    }

    const responseValidation = registerResponseSchema.safeParse(result.data);

    if (!responseValidation.success) {
        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode: API_ERROR_CODES.invalidResponse,
            },
        };
    }

    const {
        verification: { id: verificationId, emailSent },
    } = responseValidation.data;

    return {
        status: OPERATION_STATUS.success,
        data: {
            verificationId,
            emailSent,
        },
    };
}
