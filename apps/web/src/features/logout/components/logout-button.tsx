'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useFormStatus } from 'react-dom';

import { SubmitButton } from '@/components/forms';
import { useActionErrorToast } from '@/hooks';
import { OPERATION_STATUS } from '@/lib/actions';
import { withSessionLock } from '@/lib/session/session-lock';

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
  const t = useTranslations('Logout');
  const { dismissError, showError } = useActionErrorToast({ title: t('errorTitle') });

  async function handleLogout() {
    dismissError();

    const result = await withSessionLock(() => logoutUser(locale));

    if (result.status === OPERATION_STATUS.error) {
      showError(result.error);
    }
  }

  return (
    <form action={handleLogout}>
      <LogoutSubmitButton />
    </form>
  );
}
