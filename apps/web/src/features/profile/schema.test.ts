import { describe, expect, it } from 'vitest';

import { BIO_MAX_LENGTH, profilePreferencesSchema } from './schema';

const validPreferences = {
  avatarPresetId: 'fox',
  bio: 'Me gustan los juegos.',
};

describe('profilePreferencesSchema', () => {
  it('accepts valid preferences', () => {
    expect(profilePreferencesSchema.safeParse(validPreferences).success).toBe(
      true,
    );
  });

  it('accepts null avatar and biography', () => {
    expect(
      profilePreferencesSchema.safeParse({ avatarPresetId: null, bio: null })
        .success,
    ).toBe(true);
  });

  it('accepts an empty biography', () => {
    expect(
      profilePreferencesSchema.safeParse({ ...validPreferences, bio: '' })
        .success,
    ).toBe(true);
  });

  it('accepts exactly the maximum biography length', () => {
    expect(
      profilePreferencesSchema.safeParse({
        ...validPreferences,
        bio: 'a'.repeat(BIO_MAX_LENGTH),
      }).success,
    ).toBe(true);
  });

  it('trims whitespace before validating the biography length', () => {
    const result = profilePreferencesSchema.safeParse({
      ...validPreferences,
      bio: `  ${'a'.repeat(BIO_MAX_LENGTH)}  `,
    });
    expect(result.success).toBe(true);
    expect(result.data?.bio).toBe('a'.repeat(BIO_MAX_LENGTH));
  });

  it('rejects a biography longer than the maximum', () => {
    const result = profilePreferencesSchema.safeParse({
      ...validPreferences,
      bio: 'a'.repeat(BIO_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['bio']);
  });

  it('rejects an unknown avatar', () => {
    const result = profilePreferencesSchema.safeParse({
      ...validPreferences,
      avatarPresetId: 'old-avatar',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['avatarPresetId']);
  });

  it('rejects an avatar with the wrong type', () => {
    expect(
      profilePreferencesSchema.safeParse({
        ...validPreferences,
        avatarPresetId: 42,
      }).success,
    ).toBe(false);
  });

  it('rejects a biography with the wrong type', () => {
    expect(
      profilePreferencesSchema.safeParse({ ...validPreferences, bio: 42 })
        .success,
    ).toBe(false);
  });

  it('rejects missing required preferences', () => {
    expect(profilePreferencesSchema.safeParse({}).success).toBe(false);
  });
});
