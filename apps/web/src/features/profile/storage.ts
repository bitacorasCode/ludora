import { type ProfilePreferences, profilePreferencesSchema } from './schema';

const STORAGE_KEY = 'ludora:preview-profile';
const PROFILE_CHANGE_EVENT = 'ludora:preview-profile-change';

export function getStoredProfile() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getServerProfile() {
  return null;
}

export function subscribeToProfile(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onStoreChange();
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener(PROFILE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(PROFILE_CHANGE_EVENT, onStoreChange);
  };
}

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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
}
