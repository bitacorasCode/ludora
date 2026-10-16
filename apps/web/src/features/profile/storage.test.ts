import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ProfilePreferences } from './schema';
import {
  getStoredProfile,
  readPreferences,
  savePreferences,
  subscribeToProfile,
} from './storage';

const preferences: ProfilePreferences = {
  avatarPresetId: 'fox',
  bio: 'Me gustan los juegos.',
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('profile storage', () => {
  it('reads valid preferences', () => {
    expect(readPreferences(JSON.stringify(preferences))).toEqual(preferences);
  });

  it('returns null for missing and empty values', () => {
    expect(readPreferences(null)).toBeNull();
    expect(readPreferences('')).toBeNull();
  });

  it('returns null for corrupted JSON', () => {
    expect(readPreferences('{broken')).toBeNull();
  });

  it('returns null for valid JSON with the wrong structure', () => {
    expect(readPreferences('null')).toBeNull();
    expect(readPreferences('[]')).toBeNull();
    expect(readPreferences('{"nickname":"demo"}')).toBeNull();
  });

  it('rejects saved values with obsolete avatars or invalid biographies', () => {
    expect(
      readPreferences(
        JSON.stringify({ ...preferences, avatarPresetId: 'obsolete' }),
      ),
    ).toBeNull();
    expect(
      readPreferences(JSON.stringify({ ...preferences, bio: 42 })),
    ).toBeNull();
  });

  it('round-trips saved preferences and announces the change', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToProfile(onChange);
    try {
      savePreferences(preferences);
      expect(readPreferences(getStoredProfile())).toEqual(preferences);
      expect(onChange).toHaveBeenCalledOnce();
    } finally {
      unsubscribe();
    }
  });

  it('propagates storage write failures', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });
    expect(() => savePreferences(preferences)).toThrow('Storage full');
  });
});
