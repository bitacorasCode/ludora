'use client';

import { useTranslations } from 'next-intl';
import { useLayoutEffect, useState } from 'react';

import { useNavigationGuard } from '@/components/navigation';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';

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
  const actions = useTranslations('Common.actions');
  const { requestNavigation } = useNavigationGuard();
  const [isEditing, setIsEditing] = useState(false);

  useLayoutEffect(() => () => setIsEditing(false), []);

  return (
    <Dialog
      open={isEditing}
      onOpenChange={(open) => {
        if (open) setIsEditing(true);
        else requestNavigation(() => setIsEditing(false));
      }}
    >
      <DialogTrigger asChild>
        <Button
          type='button'
          variant='outline'
          aria-describedby={descriptionId}
        >
          {t('password.change')}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={actions('close')}>
        <DialogHeader>
          <DialogTitle>{t('password.form.title')}</DialogTitle>
          <DialogDescription>{t('password.description')}</DialogDescription>
        </DialogHeader>
        <ChangePasswordForm
          userId={userId}
          onClose={() => setIsEditing(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
