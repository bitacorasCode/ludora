import { createLocalStorageStore } from '@/lib/storage';

import { type ProfilePreferences, profilePreferencesSchema } from './schema';

const STORAGE_KEY = 'ludora:preview-profile';
const profileStorage = createLocalStorageStore(STORAGE_KEY);

export const getStoredProfile = profileStorage.getSnapshot;
export const getServerProfileSnapshot = profileStorage.getServerSnapshot;
export const subscribeToProfile = profileStorage.subscribe;

export function readPreferences(value: string | null): ProfilePreferences | null {
  if (!value) return null;

  try {
    const result = profilePreferencesSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function savePreferences(preferences: ProfilePreferences) {
  profileStorage.set(JSON.stringify(preferences));
}
