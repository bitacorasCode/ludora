'use client';

import { useSyncExternalStore } from 'react';

import { previewProfile } from '../config';
import {
    getServerProfileSnapshot,
    getStoredProfile,
    readPreferences,
    savePreferences,
    subscribeToProfile,
} from '../storage';

export function usePreviewProfile() {
    const storedProfile = useSyncExternalStore(
        subscribeToProfile,
        getStoredProfile,
        getServerProfileSnapshot,
    );
    if (storedProfile === undefined) {
        return { profile: null, saveProfile: savePreferences };
    }

    const preferences = readPreferences(storedProfile);
    const profile = preferences ? { ...previewProfile, ...preferences } : previewProfile;

    return { profile, saveProfile: savePreferences };
}
