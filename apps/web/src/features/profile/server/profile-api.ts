import 'server-only';

import {
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';
import {
    API_ERROR_CODES,
    type ApiOptions,
    authenticatedApi,
} from '@/lib/api';

import {
    type ProfilePreferences,
    type ProfileResponse,
    profileResponseSchema,
} from '../schema';

const PROFILE_ENDPOINT = '/profile';

function parseProfileResult(
    result: ActionResult<unknown>,
): ActionResult<ProfileResponse> {
    if (result.status === OPERATION_STATUS.error) {
        return result;
    }

    const validation = profileResponseSchema.safeParse(result.data);

    if (!validation.success) {
        return {
            status: OPERATION_STATUS.error,
            error: {
                errorCode: API_ERROR_CODES.invalidResponse,
            },
        };
    }

    return {
        status: OPERATION_STATUS.success,
        data: validation.data,
    };
}

export const profileApi = {
    async get(options?: ApiOptions): Promise<ActionResult<ProfileResponse>> {
        const result = await authenticatedApi.get(PROFILE_ENDPOINT, options);

        return parseProfileResult(result);
    },

    async save(
        data: ProfilePreferences,
    ): Promise<ActionResult<ProfileResponse>> {
        const result = await authenticatedApi.put(PROFILE_ENDPOINT, data);

        return parseProfileResult(result);
    },
};