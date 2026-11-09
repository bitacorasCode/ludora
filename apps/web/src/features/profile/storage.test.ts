import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ProfilePreferences } from './schema';
import { createProfileStorage, readPreferences } from './storage';

const PROFILE_USER_ID = 'd5a705f8-bffa-4c42-817f-aa61b901eab1';
const OTHER_USER_ID = 'b2cd9d1f-b863-4640-bc42-94a3b69c7559';
const profileStorage = createProfileStorage(PROFILE_USER_ID);

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
    const unsubscribe = profileStorage.subscribe(onChange);
    try {
      profileStorage.save(preferences);
      expect(readPreferences(profileStorage.getSnapshot())).toEqual(preferences);
      expect(onChange).toHaveBeenCalledOnce();
    } finally {
      unsubscribe();
    }
  });

  it('propagates storage write failures', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });
    expect(() => profileStorage.save(preferences)).toThrow('Storage full');
  });

  it('keeps preferences and change notifications isolated by user', () => {
    const otherStorage = createProfileStorage(OTHER_USER_ID);
    const onChange = vi.fn();
    const unsubscribe = profileStorage.subscribe(onChange);
    try {
      otherStorage.save({ avatarPresetId: 'planet', bio: 'Otro perfil' });
      expect(profileStorage.getSnapshot()).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
      profileStorage.save(preferences);
      expect(onChange).toHaveBeenCalledOnce();
      expect(readPreferences(profileStorage.getSnapshot())).toEqual(preferences);
      expect(readPreferences(otherStorage.getSnapshot())).toEqual({
        avatarPresetId: 'planet',
        bio: 'Otro perfil',
      });
    } finally {
      unsubscribe();
    }
  });

  it('stores only editable preferences from a server response', () => {
    const response = { ...preferences, userId: PROFILE_USER_ID };
    profileStorage.save(response);
    expect(JSON.parse(profileStorage.getSnapshot()!)).toEqual(preferences);
  });
});
