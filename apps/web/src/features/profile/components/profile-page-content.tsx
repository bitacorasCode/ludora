'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/feedback';
import { useNavigationGuard } from '@/components/navigation';
import { PageHeading } from '@/components/typography';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';
import { useActionErrorToast } from '@/hooks';
import { OPERATION_STATUS } from '@/lib/actions';

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
  const router = useRouter();
  const t = useTranslations('Profile');
  const actions = useTranslations('Common.actions');
  const errors = useTranslations('Common.errors');
  const { requestNavigation } = useNavigationGuard();

  const { profile, error, reload, canEdit, save } = useProfile(
    userId,
    nickname,
  );

  const [isEditing, setIsEditing] = useState(false);
  const isActive = useRef(false);

  const { showError, dismissError } = useActionErrorToast({
    title: t('saveError'),
  });

  useLayoutEffect(() => {
    isActive.current = true;

    return () => {
      isActive.current = false;
      // Activity preserves state when Next.js hides a cached route.
      setIsEditing(false);
    };
  }, []);

  async function handleSave(values: ProfilePreferences) {
    dismissError();

    const result = await save(values);

    if (!result || !isActive.current) return;

    if (result.status === OPERATION_STATUS.error) {
      showError(result.error);
      return;
    }

    setIsEditing(false);

    toast.success(t('saved'), {
      id: PROFILE_SAVED_TOAST_ID,
    });

    router.refresh();
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
        <Dialog
          open={isEditing}
          onOpenChange={(open) => {
            if (open) setIsEditing(true);
            else requestNavigation(handleCancel);
          }}
        >
          <ProfileIdentity
            profile={profile}
            editAction={
              canEdit && (
                <DialogTrigger asChild>
                  <Button
                    type='button'
                    variant='outline'
                    className='self-start sm:self-center'
                  >
                    {t('edit')}
                  </Button>
                </DialogTrigger>
              )
            }
          />
          {profile && (
            <DialogContent className='max-w-2xl' closeLabel={actions('close')}>
              <DialogHeader>
                <DialogTitle>{t('edit')}</DialogTitle>
                <DialogDescription>{t('description')}</DialogDescription>
              </DialogHeader>
              <ProfileEditor
                profile={profile}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </DialogContent>
          )}
        </Dialog>
      )}
    </>
  );
}
