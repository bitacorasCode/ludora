import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui';

import { type AvatarPresetId, avatarPresets } from '../config';

type ProfileAvatarProps = {
  nickname: string;
  avatarPresetId: AvatarPresetId | null;
  size?: 'default' | 'lg';
};

export function ProfileAvatar({
  nickname,
  avatarPresetId,
  size = 'default',
}: ProfileAvatarProps) {
  const initial = nickname.trim().charAt(0).toLocaleUpperCase() || '?';
  const selectedAvatar = avatarPresets.find(
    (preset) => preset.id === avatarPresetId,
  );

  return (
    <Avatar size={size} aria-hidden='true'>
      {selectedAvatar && <AvatarImage src={selectedAvatar.src} alt='' />}
      <AvatarFallback>{initial}</AvatarFallback>
    </Avatar>
  );
}
