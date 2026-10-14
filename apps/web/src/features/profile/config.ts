export const avatarPresets = [
  { id: 'comet', src: '/avatars/comet.svg' },
  { id: 'planet', src: '/avatars/planet.svg' },
  { id: 'fox', src: '/avatars/fox.svg' },
  { id: 'castle', src: '/avatars/castle.svg' },
  { id: 'clover', src: '/avatars/clover.svg' },
  { id: 'die', src: '/avatars/die.svg' },
] as const;

export type AvatarPresetId = (typeof avatarPresets)[number]['id'];

export function isAvatarPresetId(value: string): value is AvatarPresetId {
  return avatarPresets.some((preset) => preset.id === value);
}

export type Profile = {
  nickname: string;
  avatarPresetId: AvatarPresetId | null;
  bio: string | null;
};

// Default profile used while authentication and persistence are unavailable.
export const previewProfile: Profile = {
  nickname: 'jugador_demo',
  avatarPresetId: null,
  bio: null,
};
