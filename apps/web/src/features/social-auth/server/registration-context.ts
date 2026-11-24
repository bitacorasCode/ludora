import 'server-only';

import { AUTH_ERROR_CODES } from '@ludora/contracts/auth';
import type { z } from 'zod';

import { type ActionResult, OPERATION_STATUS } from '@/lib/actions';
import { publicApi } from '@/lib/api';
import { parseApiResponse } from '@/lib/api/parse-api-response';

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

    return parseApiResponse(result, oauthRegistrationContextSchema);
}
