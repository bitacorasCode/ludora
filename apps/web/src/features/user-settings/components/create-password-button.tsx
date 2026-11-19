'use client';

import { useTranslations } from 'next-intl';

import { SubmitButton } from '@/components/forms';

import { useCreatePasswordRequest } from '../hooks/use-create-password-request';

type CreatePasswordButtonProps = {
  userId: string;
  descriptionId: string;
};

export function CreatePasswordButton({ userId, descriptionId }: CreatePasswordButtonProps) {
  const t = useTranslations('UserSettings.password.create');
  const { requestCreation, isSubmitting } = useCreatePasswordRequest(userId);

  return (
    <form action={requestCreation} aria-label={t('submit')} aria-busy={isSubmitting}>
      <SubmitButton
        variant='outline'
        aria-describedby={descriptionId}
        isSubmitting={isSubmitting}
        mainText={t('submit')}
        submittingText={t('submitting')}
      />
    </form>
  );
}
