'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useFormStatus } from 'react-dom';

import { SubmitButton } from '@/components/forms';

import { logoutUser } from '../actions';

function LogoutSubmitButton() {
  const t = useTranslations('Logout');
  const { pending } = useFormStatus();

  return (
    <SubmitButton
      variant='ghost'
      className='w-full justify-start'
      mainText={t('submit')}
      submittingText={t('submitting')}
      isSubmitting={pending}
    />
  );
}

export function LogoutButton() {
  const locale = useLocale();

  return (
    <form action={() => logoutUser(locale)}>
      <LogoutSubmitButton />
    </form>
  );
}
