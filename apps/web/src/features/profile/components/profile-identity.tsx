import { useTranslations } from 'next-intl';

import { BodyText, SectionTitle } from '@/components/typography';
import { Button, Card, CardContent } from '@/components/ui';

import type { Profile } from '../config';
import { ProfileAvatar } from './profile-avatar';
import { ProfileIdentitySkeleton } from './profile-identity-skeleton';

type ProfileIdentityProps = {
  profile: Profile | null;
  isEditing: boolean;
  onEdit: () => void;
};

export function ProfileIdentity({
  profile,
  isEditing,
  onEdit,
}: ProfileIdentityProps) {
  const t = useTranslations('Profile');

  return (
    <Card
      role={profile ? undefined : 'status'}
      aria-label={profile ? undefined : t('loading')}
    >
      <CardContent className='flex flex-col items-start gap-5 sm:flex-row sm:items-center'>
        {profile ? (
          <>
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
                {profile.bio?.trim() || t('emptyBio')}
              </BodyText>
            </div>
            {!isEditing && (
              <Button
                type='button'
                variant='outline'
                className='self-start sm:self-center'
                onClick={onEdit}
              >
                {t('edit')}
              </Button>
            )}
          </>
        ) : (
          <ProfileIdentitySkeleton />
        )}
      </CardContent>
    </Card>
  );
}
