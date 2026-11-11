import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';

import { BodyText, SectionTitle } from '@/components/typography';
import { Card, CardContent } from '@/components/ui';

import type { Profile } from '../config';
import { ProfileEditor } from './editor/profile-editor';
import { ProfileAvatar } from './profile-avatar';
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
    <Card>
      <CardContent className='flex flex-col items-start gap-5 sm:flex-row sm:items-center'>
        <ProfileAvatar
          nickname={profile.nickname}
          avatarPresetId={profile.avatarPresetId}
          size='lg'
        />
        <div className='min-w-0 flex-1 space-y-2'>
          <SectionTitle className='break-words'>
            {profile.nickname}
          </SectionTitle>
          <BodyText className='whitespace-pre-wrap break-words'>
            {profile.bio?.trim() || t('bio.empty')}
          </BodyText>
        </div>
        <ProfileEditor profile={profile} canEdit={canEdit} onSave={onSave} />
      </CardContent>
    </Card>
  );
}
