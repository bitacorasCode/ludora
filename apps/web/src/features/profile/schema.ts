import {
    PROFILE_AVATAR_PRESET_IDS,
    PROFILE_BIO_MAX_LENGTH as BIO_MAX_LENGTH,
} from '@ludora/contracts/profile';
import { z } from 'zod';

import {
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';

export { BIO_MAX_LENGTH };

export const profilePreferencesSchema = z.object({
    avatarPresetId: z.enum(PROFILE_AVATAR_PRESET_IDS).nullable(),
    bio: z.string().trim().max(BIO_MAX_LENGTH).nullable(),
});

export const profileResponseSchema = profilePreferencesSchema.extend({
    userId: z.uuid(),
});

export const profileLoadResultSchema = z.discriminatedUnion('status', [
    z.object({
        status: z.literal(OPERATION_STATUS.success),
        data: profileResponseSchema,
    }),
    z.object({
        status: z.literal(OPERATION_STATUS.error),
        error: z.object({
            errorCode: z.string().min(1),
            statusCode: z.number().int().optional(),
            retryAfterSeconds: z.number().int().positive().optional(),
        }),
    }),
]) satisfies z.ZodType<ActionResult<ProfileResponse>>;

export type ProfileResponse = z.infer<typeof profileResponseSchema>;

export type ProfilePreferences = z.infer<typeof profilePreferencesSchema>;