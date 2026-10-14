import { useTranslations } from 'next-intl';

import { PageContainer, PageSection } from '@/components/layout';
import { BodyText, PageHeading, SectionTitle } from '@/components/typography';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardContent,
} from '@/components/ui';

import type { Profile } from '../config';

type ProfileIdentityProps = {
  profile: Profile;
};

export function ProfileIdentity({ profile }: ProfileIdentityProps) {
  const t = useTranslations('Profile');
  const initial = profile.nickname.trim().charAt(0).toLocaleUpperCase() || '?';

  return (
    <PageContainer>
      <PageSection aria-label={t('title')}>
        <PageHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
        />

        <Card>
          <CardContent className='flex flex-col items-start gap-5 sm:flex-row sm:items-center'>
            <Avatar size='lg' aria-hidden='true'>
              {profile.avatarUrl && (
                <AvatarImage src={profile.avatarUrl} alt='' />
              )}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className='min-w-0 space-y-2'>
              <SectionTitle className='break-words'>
                {profile.nickname}
              </SectionTitle>
              <BodyText>{profile.bio?.trim() || t('emptyBio')}</BodyText>
            </div>
          </CardContent>
        </Card>
      </PageSection>
    </PageContainer>
  );
}
