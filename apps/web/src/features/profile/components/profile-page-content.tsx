'use client';

import { useTranslations } from 'next-intl';

import { ErrorState } from '@/components/feedback';
import { PageHeading } from '@/components/typography';
import { Button } from '@/components/ui';

import { useProfile } from '../hooks/use-profile';
import { ProfileIdentity } from './profile-identity';

type ProfilePageContentProps = {
  userId: string;
  nickname: string;
};

export function ProfilePageContent({
  userId,
  nickname,
}: ProfilePageContentProps) {
  const t = useTranslations('Profile');
  const actions = useTranslations('Common.actions');
  const errors = useTranslations('Common.errors');

  const { profile, error, reload, canEdit, save } = useProfile(
    userId,
    nickname,
  );

  const errorRetryAction = (
    <Button type='button' onClick={reload}>
      {actions('retry')}
    </Button>
  );

  const errorDescription = error
    ? errors.has(error.errorCode)
      ? errors(error.errorCode)
      : errors('unknown')
    : null;

  return (
    <>
      <PageHeading
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />

      {error && errorDescription && (
        <ErrorState
          title={t('loadError')}
          description={errorDescription}
          primaryAction={errorRetryAction}
        />
      )}

      {(profile || !error) && (
        <ProfileIdentity profile={profile} canEdit={canEdit} onSave={save} />
      )}
    </>
  );
}
