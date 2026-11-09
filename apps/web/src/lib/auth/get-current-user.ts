import 'server-only';

import { cache } from 'react';
import { z } from 'zod';

import {
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
});

const currentUserResponseSchema = z.object({
    user: currentUserSchema,
});

export type CurrentUser = z.infer<typeof currentUserSchema>;

export const getCurrentUser = cache(
    async (): Promise<CurrentUser | null> => {
        const result = await authenticatedApi.get(
            CURRENT_USER_ENDPOINT,
        );

        if (result.status === OPERATION_STATUS.error) {
            if (isAuthenticationError(result.error)) {
                return null;
            }

            const { errorCode } = result.error;

            throw new Error(errorCode, {
                cause: result.error,
            });
        }

        const validation = currentUserResponseSchema.safeParse(
            result.data,
        );

        if (!validation.success) {
            throw new Error(API_ERROR_CODES.invalidResponse);
        }

        const { user } = validation.data;

        return user;
    },
);