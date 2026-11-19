import 'server-only';

import { AUTH_ERROR_CODES } from '@ludora/security';
import { z } from 'zod';

import { type ActionResult, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, publicApi } from '@/lib/api';

import { SOCIAL_AUTH_ENDPOINTS } from './config';
import { getOAuthRegistrationCookie } from './cookies';
import { oauthRegistrationContextSchema } from './schemas';

export async function getOAuthRegistrationContext(): Promise<
    ActionResult<z.infer<typeof oauthRegistrationContextSchema>>
> {
    const registration = await getOAuthRegistrationCookie();

    if (!registration) {
        return {
            status: OPERATION_STATUS.error,
            error: { errorCode: AUTH_ERROR_CODES.oauthRegistrationInvalid },
        };
    }

    const result = await publicApi.post(SOCIAL_AUTH_ENDPOINTS.registrationContext, {
        registrationToken: registration.registrationToken,
    });

    if (result.status === OPERATION_STATUS.error) return result;

    const validation = oauthRegistrationContextSchema.safeParse(result.data);

    if (!validation.success) {
        return {
            status: OPERATION_STATUS.error,
            error: { errorCode: API_ERROR_CODES.invalidResponse },
        };
    }

    return { status: OPERATION_STATUS.success, data: validation.data };
}
