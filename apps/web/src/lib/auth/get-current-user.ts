import 'server-only';

import { PROFILE_AVATAR_PRESET_IDS } from '@ludora/contracts/profile';
import { io } from 'next/cache';
import { cache } from 'react';
import { z } from 'zod';

import {
    type ActionResult,
    isAuthenticationError,
    OPERATION_STATUS,
} from '@/lib/actions';
import {
    API_ERROR_CODES,
    authenticatedApi,
} from '@/lib/api';

const CURRENT_USER_ENDPOINT = '/auth/me';

const currentUserSchema = z.object({
    id: z.uuid(),
    nickname: z.string().min(1),
    email: z.email(),
    createdAt: z.iso.datetime(),
    avatarPresetId: z.enum(PROFILE_AVATAR_PRESET_IDS).nullable(),
    hasPassword: z.boolean(),
});

const currentUserResponseSchema = z.object({
    user: currentUserSchema,
});

export type CurrentUser = z.infer<typeof currentUserSchema>;

export async function fetchCurrentUser(): Promise<ActionResult<CurrentUser>> {
    const result = await authenticatedApi.get(CURRENT_USER_ENDPOINT);

    if (result.status === OPERATION_STATUS.error) return result;

    const validation = currentUserResponseSchema.safeParse(result.data);

    if (!validation.success) {
        return {
            status: OPERATION_STATUS.error,
            error: { errorCode: API_ERROR_CODES.invalidResponse },
        };
    }

    return { status: OPERATION_STATUS.success, data: validation.data.user };
}

export const getCurrentUserResult = cache(async () => {
    // Keep session validation outside build-time and runtime prerenders.
    await io();
    return fetchCurrentUser();
});

export const getCurrentUser = cache(
    async (): Promise<CurrentUser | null> => {
        const result = await getCurrentUserResult();

        if (result.status === OPERATION_STATUS.error) {
            if (isAuthenticationError(result.error)) {
                return null;
            }

            const { errorCode } = result.error;

            throw new Error(errorCode, {
                cause: result.error,
            });
        }

        return result.data;
    },
);
