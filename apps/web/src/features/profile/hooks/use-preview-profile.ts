'use client';

import { useSyncExternalStore } from 'react';

import type { Profile } from '../config';
import {
  getServerProfile,
  getStoredProfile,
  readPreferences,
  savePreferences,
  subscribeToProfile,
} from '../storage';

export function usePreviewProfile(initialProfile: Profile) {
  const storedProfile = useSyncExternalStore(
    subscribeToProfile,
    getStoredProfile,
    getServerProfile,
  );
  const preferences = readPreferences(storedProfile);
  const profile = preferences ? { ...initialProfile, ...preferences } : initialProfile;

  return { profile, saveProfile: savePreferences };
}
