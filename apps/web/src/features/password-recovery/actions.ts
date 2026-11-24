'use server';

import { AUTH_ERROR_CODES } from '@ludora/security';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { resolveLocale } from '@/i18n/resolve-locale';
import {
    type ActionResult,
    createValidationFailure,
    OPERATION_STATUS,
} from '@/lib/actions';
import { publicApi } from '@/lib/api';
import { parseApiResponse } from '@/lib/api/parse-api-response';
import { createPasswordResetSchema, createRecoveryRequestSchema } from '@/lib/schemas';
import { deleteSession } from '@/lib/session';

import { passwordResetTokenSchema } from './schema';

const PASSWORD_RECOVERY_REQUEST_ENDPOINT = '/auth/forgot-password';
const PASSWORD_RESET_ENDPOINT = '/auth/reset-password';
const recoveryRequestResponseSchema = z.object({ accepted: z.literal(true) });
const passwordResetResponseSchema = z.object({ reset: z.literal(true) });

export async function requestPasswordRecovery(
    locale: string,
    formData: unknown,
): Promise<ActionResult> {
    const validLocale = resolveLocale(locale);
    const t = await getTranslations({
        locale: validLocale,
        namespace: 'PasswordRecovery.validation',
    });

    const validation = createRecoveryRequestSchema(t).safeParse(formData);

    if (!validation.success) {
        return createValidationFailure(validation.error.issues);
    }

    const result = await publicApi.post(
        PASSWORD_RECOVERY_REQUEST_ENDPOINT,
        validation.data,
    );
    const response = parseApiResponse(result, recoveryRequestResponseSchema);

    if (response.status === OPERATION_STATUS.error) return response;

    return {
        status: OPERATION_STATUS.success,
        data: null,
    };
}

export async function resetPassword(
    locale: string,
    token: unknown,
    formData: unknown,
): Promise<ActionResult> {
    const tokenValidation = passwordResetTokenSchema.safeParse(token);

    if (!tokenValidation.success) {
        return {
            status: OPERATION_STATUS.error,
            error: { errorCode: AUTH_ERROR_CODES.passwordResetInvalid },
        };
    }

    const validLocale = resolveLocale(locale);
    const t = await getTranslations({
        locale: validLocale,
        namespace: 'PasswordRecovery.validation',
    });
    const validation = createPasswordResetSchema(t).safeParse(formData);

    if (!validation.success) {
        return createValidationFailure(validation.error.issues);
    }

    const { password } = validation.data;
    const result = await publicApi.post(PASSWORD_RESET_ENDPOINT, {
        token: tokenValidation.data,
        password,
    });
    const response = parseApiResponse(result, passwordResetResponseSchema);

    if (response.status === OPERATION_STATUS.error) return response;

    await deleteSession();

    return {
        status: OPERATION_STATUS.success,
        data: null,
    };
}
