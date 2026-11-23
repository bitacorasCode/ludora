'use client';

import { useTranslations } from 'next-intl';

import { ErrorState } from '@/components/feedback';
import { Button } from '@/components/ui';
import type { ActionResult } from '@/lib/actions';

import { useProfile } from '../hooks/use-profile';
import type { ProfileResponse } from '../schema';
import { ProfileIdentity } from './profile-identity';

type ProfilePageContentProps = {
  userId: string;
  nickname: string;
  initialResult: ActionResult<ProfileResponse>;
};

export function ProfilePageContent({ userId, nickname, initialResult }: ProfilePageContentProps) {
  const t = useTranslations('Profile');
  const actions = useTranslations('Common.actions');
  const errors = useTranslations('Common.errors');

  const { profile, error, reload, canEdit, save } = useProfile(
    userId,
    nickname,
    initialResult,
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
