'use client';

import { useSyncExternalStore } from 'react';

import type { Profile } from '../config';
import {
    getServerProfileSnapshot,
    getStoredProfile,
    readPreferences,
    savePreferences,
    subscribeToProfile,
} from '../storage';

export function usePreviewProfile(initialProfile: Profile) {
    const storedProfile = useSyncExternalStore(
        subscribeToProfile,
        getStoredProfile,
        getServerProfileSnapshot,
    );
    if (storedProfile === undefined) {
        return { profile: null, saveProfile: savePreferences };
    }

    const preferences = readPreferences(storedProfile);
    const profile = preferences ? { ...initialProfile, ...preferences } : initialProfile;

    return { profile, saveProfile: savePreferences };
}
