import {
    PROFILE_AVATAR_PRESET_IDS,
    PROFILE_BIO_MAX_LENGTH,
} from '@ludora/contracts/profile';
import { z } from 'zod';

export const saveProfileSchema = z.strictObject({
    expectedUserId: z.uuid().optional(),
    avatarPresetId: z.enum(PROFILE_AVATAR_PRESET_IDS).nullable(),
    bio: z.string().trim().max(PROFILE_BIO_MAX_LENGTH).nullable(),
});

export type SaveProfileDto = z.infer<typeof saveProfileSchema>;
