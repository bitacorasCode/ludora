'use client';

import { useTranslations } from 'next-intl';
import { useLayoutEffect, useRef, useState } from 'react';

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
  const trigger = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  useLayoutEffect(() => {
    if (!isEditing && wasEditing.current) trigger.current?.focus();
    wasEditing.current = isEditing;
  }, [isEditing]);

  useLayoutEffect(() => () => setIsEditing(false), []);

  if (isEditing) {
    return <ChangePasswordForm userId={userId} onClose={() => setIsEditing(false)} />;
  }

  return (
    <Button
      ref={trigger}
      type='button'
      variant='outline'
      aria-describedby={descriptionId}
      onClick={() => setIsEditing(true)}
    >
      {t('password.change')}
    </Button>
  );
}
