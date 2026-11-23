'use server';

import { z } from 'zod';

import {
    ACTION_ERROR_CODES,
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';

import {
    profilePreferencesSchema,
    type ProfileResponse,
} from './schema';
import { profileApi } from './server/profile-api';

const saveProfileInputSchema = z.object({
    expectedUserId: z.uuid(),
    preferences: profilePreferencesSchema,
});

export async function saveProfile(
    expectedUserId: string,
    formData: unknown,
): Promise<ActionResult<ProfileResponse>> {
    const validation = saveProfileInputSchema.safeParse({ expectedUserId, preferences: formData });

    if (!validation.success) {
        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode: ACTION_ERROR_CODES.validationFailed,
            },
        };
    }

    return profileApi.save({
        ...validation.data.preferences,
        expectedUserId: validation.data.expectedUserId,
    });
}
