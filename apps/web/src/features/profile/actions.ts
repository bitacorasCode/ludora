'use server';

import {
    ACTION_ERROR_CODES,
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

import {
    profilePreferencesSchema,
    type ProfileResponse,
} from './schema';
import { profileApi } from './server/profile-api';

export async function saveProfile(
    expectedUserId: string,
    formData: unknown,
): Promise<ActionResult<ProfileResponse>> {
    const validation = profilePreferencesSchema.safeParse(formData);

    if (!validation.success) {
        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode: ACTION_ERROR_CODES.validationFailed,
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

    return profileApi.save(validation.data);
}