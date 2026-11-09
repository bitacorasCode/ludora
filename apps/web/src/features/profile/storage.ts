import { createLocalStorageStore } from '@/lib/storage';

import {
    type ProfilePreferences,
    profilePreferencesSchema,
} from './schema';

const PROFILE_STORAGE_KEY_PREFIX = 'ludora:profile:';

export function createProfileStorage(userId: string) {
    const store = createLocalStorageStore(
        `${PROFILE_STORAGE_KEY_PREFIX}${userId}`,
    );

    return {
        ...store,

        save({ avatarPresetId, bio }: ProfilePreferences) {
            store.set(JSON.stringify({
                avatarPresetId,
                bio,
            }));
        },
    };
}

export function readPreferences(
    value: string | null,
): ProfilePreferences | null {
    if (!value) return null;

    try {
        const stored: unknown = JSON.parse(value);

        const result = profilePreferencesSchema.safeParse(stored);

        return result.success ? result.data : null;
    } catch {
        return null;
    }
}
