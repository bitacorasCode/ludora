import {
    type AvatarPresetId,
    PROFILE_AVATAR_PRESET_IDS,
} from '@ludora/contracts/profile';

export type { AvatarPresetId };

export const avatarPresets = PROFILE_AVATAR_PRESET_IDS.map((id) => ({
    id,
    src: `/avatars/${id}.svg`,
}));

export function isAvatarPresetId(value: string): value is AvatarPresetId {
    return PROFILE_AVATAR_PRESET_IDS.some((id) => id === value);
}

export type Profile = {
    nickname: string;
    avatarPresetId: AvatarPresetId | null;
    bio: string | null;
};
