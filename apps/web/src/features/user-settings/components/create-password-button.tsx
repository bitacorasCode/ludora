'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { Alert } from '@/components/feedback';
import { SubmitButton } from '@/components/forms';

import { useCreatePasswordRequest } from '../hooks/use-create-password-request';

type CreatePasswordButtonProps = {
  userId: string;
  descriptionId: string;
};

export function CreatePasswordButton({ userId, descriptionId }: CreatePasswordButtonProps) {
  const t = useTranslations('UserSettings.password.create');
  const { requestCreation, isRequestAccepted, isSubmitting } = useCreatePasswordRequest(userId);
  const confirmation = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRequestAccepted) {
      confirmation.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [isRequestAccepted]);

  return (
    <>
      <form action={requestCreation} aria-label={t('submit')} aria-busy={isSubmitting}>
        <SubmitButton
          variant='outline'
          aria-describedby={descriptionId}
          isSubmitting={isSubmitting}
          mainText={t('submit')}
          submittingText={t('submitting')}
        />
      </form>
      <div
        ref={confirmation}
        className={isRequestAccepted ? 'mt-2 w-full scroll-mb-4 [&>[data-slot=alert]]:mb-0' : 'sr-only'}
      >
        <Alert
          status='success'
          title={isRequestAccepted ? t('success.title') : undefined}
          message={isRequestAccepted ? t('success.message') : ''}
        />
      </div>
    </>
  );
}
