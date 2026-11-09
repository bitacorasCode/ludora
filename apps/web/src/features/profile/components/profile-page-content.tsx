'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/feedback';
import { PageHeading } from '@/components/typography';
import { Button } from '@/components/ui';
import { useActionErrorToast } from '@/hooks';
import { OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES } from '@/lib/api/constants';

import { saveProfile } from '../actions';
import { useProfile } from '../hooks/use-profile';
import type { ProfilePreferences } from '../schema';
import { ProfileEditor } from './editor/profile-editor';
import { ProfileIdentity } from './profile-identity';

type ProfilePageContentProps = {
  userId: string;
  nickname: string;
};

const PROFILE_SAVED_TOAST_ID = 'profile-saved';

export function ProfilePageContent({
  userId,
  nickname,
}: ProfilePageContentProps) {
  const t = useTranslations('Profile');
  const actions = useTranslations('Common.actions');
  const errors = useTranslations('Common.errors');

  const { profile, error, reload, canEdit, updateProfile } = useProfile(
    userId,
    nickname,
  );

  const [isEditing, setIsEditing] = useState(false);
  const isActive = useRef(false);

  const { showError, dismissError } = useActionErrorToast({
    title: t('saveError'),
  });

  useEffect(() => {
    isActive.current = true;

    return () => {
      isActive.current = false;
    };
  }, []);

  async function handleSave(values: ProfilePreferences) {
    dismissError();

    const result = await saveProfile(userId, values);

    if (!isActive.current) return;

    if (result.status === OPERATION_STATUS.error) {
      showError(result.error);
      return;
    }

    if (!updateProfile(result.data)) {
      showError({
        errorCode: API_ERROR_CODES.invalidResponse,
      });
      return;
    }

    setIsEditing(false);
    toast.success(t('saved'), {
      id: PROFILE_SAVED_TOAST_ID,
    });
  }

  function handleCancel() {
    dismissError();
    setIsEditing(false);
  }

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
          primaryAction={
            <Button type='button' onClick={reload}>
              {actions('retry')}
            </Button>
          }
        />
      )}

      {(profile || !error) && (
        <ProfileIdentity
          profile={profile}
          isEditing={isEditing}
          onEdit={canEdit ? () => setIsEditing(true) : undefined}
        />
      )}

      {isEditing && profile && (
        <ProfileEditor
          profile={profile}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
