'use server';

import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { resolveLocale } from '@/i18n/resolve-locale';
import { ACTION_ERROR_CODES, type ActionResult, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, authenticatedApi, HTTP_STATUS } from '@/lib/api';
import { authResponseSchema, getCurrentUser } from '@/lib/auth';
import { createSession } from '@/lib/session';

import { createChangePasswordSchema } from './schema';

const CHANGE_PASSWORD_ENDPOINT = '/auth/change-password';
const changePasswordResponseSchema = authResponseSchema.extend({
  user: z.object({ id: z.uuid() }),
});

export async function changePassword(
  locale: string,
  expectedUserId: string,
  formData: unknown,
): Promise<ActionResult> {
  const validLocale = resolveLocale(locale);
  const t = await getTranslations({
    locale: validLocale,
    namespace: 'UserSettings.password.validation',
  });
  const validation = createChangePasswordSchema(t).safeParse(formData);

  if (!validation.success) {
    return {
      status: OPERATION_STATUS.error,
      error: {
        errorCode: ACTION_ERROR_CODES.validationFailed,
        validationErrors: validation.error.issues.map(({ message }) => message),
      },
    };
  }

  const user = await getCurrentUser();

  if (!user || user.id !== expectedUserId) {
    return {
      status: OPERATION_STATUS.error,
      error: {
        errorCode: API_ERROR_CODES.authenticationRequired,
        statusCode: HTTP_STATUS.unauthorized,
      },
    };
  }

  const { currentPassword, newPassword: password } = validation.data;
  const result = await authenticatedApi.post(CHANGE_PASSWORD_ENDPOINT, {
    currentPassword,
    password,
  });

  if (result.status === OPERATION_STATUS.error) return result;

  const response = changePasswordResponseSchema.safeParse(result.data);

  if (!response.success || response.data.user.id !== expectedUserId) {
    return {
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.invalidResponse },
    };
  }

  await createSession(response.data.accessToken);

  return { status: OPERATION_STATUS.success, data: null };
}
