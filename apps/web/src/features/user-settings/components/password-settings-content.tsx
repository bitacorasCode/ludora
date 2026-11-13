'use client';

import { useTranslations } from 'next-intl';
import { useLayoutEffect, useState } from 'react';

import { GuardedContentDialog } from '@/components/overlays';
import { Button } from '@/components/ui';

import { ChangePasswordForm } from './change-password-form';

type PasswordSettingsContentProps = {
  userId: string;
  descriptionId: string;
};

export function PasswordSettingsContent({
  userId,
  descriptionId,
}: PasswordSettingsContentProps) {
  const t = useTranslations('UserSettings');
  const [isEditing, setIsEditing] = useState(false);

  useLayoutEffect(() => () => setIsEditing(false), []);

  function handleClose() {
    setIsEditing(false);
  }

  const trigger = (
    <Button type='button' variant='outline' aria-describedby={descriptionId}>
      {t('password.change')}
    </Button>
  );

  return (
    <GuardedContentDialog
      open={isEditing}
      onOpenChange={setIsEditing}
      title={t('password.form.title')}
      description={t('password.description')}
      trigger={trigger}
    >
      <ChangePasswordForm userId={userId} onClose={handleClose} />
    </GuardedContentDialog>
  );
}
