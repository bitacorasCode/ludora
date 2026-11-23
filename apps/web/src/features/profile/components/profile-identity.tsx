import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';

import { BodyText, SectionTitle } from '@/components/typography';

import type { Profile } from '../config';
import { ProfileEditor } from './editor/profile-editor';
import { ProfileAvatar } from './profile-avatar';
import { ProfileIdentityCard } from './profile-identity-card';
import { ProfileSkeleton } from './profile-skeleton';

type ProfileIdentityProps = {
  profile: Profile | null;
} & Pick<ComponentProps<typeof ProfileEditor>, 'canEdit' | 'onSave'>;

export function ProfileIdentity({
  profile,
  canEdit,
  onSave,
}: ProfileIdentityProps) {
  const t = useTranslations('Profile');

  if (!profile) {
    return <ProfileSkeleton />;
  }

  return (
    <ProfileIdentityCard
      avatar={
        <ProfileAvatar
          nickname={profile.nickname}
          avatarPresetId={profile.avatarPresetId}
          size='lg'
        />
      }
      name={<SectionTitle className='wrap-anywhere'>{profile.nickname}</SectionTitle>}
      action={<ProfileEditor profile={profile} canEdit={canEdit} onSave={onSave} />}
      bio={
        <BodyText className='wrap-anywhere whitespace-pre-wrap'>
          {profile.bio?.trim() || t('bio.empty')}
        </BodyText>
      }
    />
  );
}
