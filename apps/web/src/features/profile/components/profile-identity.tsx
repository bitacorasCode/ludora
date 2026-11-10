import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { BodyText, SectionTitle } from '@/components/typography';
import { Card, CardContent } from '@/components/ui';

import type { Profile } from '../config';
import { ProfileAvatar } from './profile-avatar';
import { ProfileSkeleton } from './profile-skeleton';

type ProfileIdentityProps = {
  profile: Profile | null;
  editAction?: ReactNode;
};

export function ProfileIdentity({ profile, editAction }: ProfileIdentityProps) {
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
        {editAction}
      </CardContent>
    </Card>
  );
}
