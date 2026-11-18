'use client';

import { Google_Sans } from 'next/font/google';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useFormStatus } from 'react-dom';

import { Button, FieldSeparator, Spinner } from '@/components/ui';
import { useActionErrorToast } from '@/hooks';
import { OPERATION_STATUS } from '@/lib/actions';
import { cn } from '@/lib/utils';

import { startGoogleAuth } from '../actions';

const googleSans = Google_Sans({
  subsets: ['latin'],
  weight: '500',
});

type SocialAuthOptionsProps = {
  disabled?: boolean;
};

function GoogleSubmitButton({ disabled }: SocialAuthOptionsProps) {
  const t = useTranslations('SocialAuth.google');
  const { pending } = useFormStatus();

  return (
    <Button
      type='submit'
      variant='outline'
      disabled={disabled || pending}
      aria-busy={pending}
      className={cn(
        googleSans.className,
        'h-10 w-full gap-2.5 border-[#747775] bg-white px-3 text-sm font-medium text-[#1f1f1f] hover:bg-[#f2f2f2]',
        'dark:bg-white dark:text-[#1f1f1f] dark:hover:bg-[#f2f2f2]',
      )}
    >
      <Image
        src='/icons/google.png'
        alt=''
        width={18}
        height={18}
        unoptimized
      />

      <span>{t(pending ? 'redirecting' : 'continue')}</span>

      {pending && (
        <Spinner
          aria-hidden='true'
          role='presentation'
          aria-label={undefined}
          className='motion-reduce:animate-none'
        />
      )}
    </Button>
  );
}

export function SocialAuthOptions({
  disabled = false,
}: SocialAuthOptionsProps) {
  const locale = useLocale();
  const t = useTranslations('SocialAuth');
  const errors = useTranslations('SocialAuth.errors');

  const { showError, dismissError } = useActionErrorToast({
    title: t('feedback.errorTitle'),
    featureErrors: errors,
  });

  async function handleGoogleAction(): Promise<void> {
    dismissError();

    const result = await startGoogleAuth(locale);

    if (result.status === OPERATION_STATUS.error) {
      showError(result.error);
    }
  }

  return (
    <div className='mb-6 space-y-6'>
      <form action={handleGoogleAction} aria-label={t('google.continue')}>
        <GoogleSubmitButton disabled={disabled} />
      </form>

      <FieldSeparator className='my-0 [&>span]:bg-card'>
        {t('separator')}
      </FieldSeparator>
    </div>
  );
}
