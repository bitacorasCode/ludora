import { z } from 'zod';

import { type AvatarPresetId, isAvatarPresetId } from './config';

export const BIO_MAX_LENGTH = 160;

export const profilePreferencesSchema = z.object({
  avatarPresetId: z
    .custom<AvatarPresetId>(
      (value) => typeof value === 'string' && isAvatarPresetId(value),
    )
    .nullable(),
  bio: z.string().trim().max(BIO_MAX_LENGTH).nullable(),
});

export type ProfilePreferences = z.infer<typeof profilePreferencesSchema>;
