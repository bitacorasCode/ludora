'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { BodyText } from '@/components/typography';
import { Button, Spinner } from '@/components/ui';

type EmailVerificationResendButtonProps = {
  secondsRemaining: number;
  isResending: boolean;
  disabled: boolean;
  onResend: () => void;
};

export function EmailVerificationResendButton({
  secondsRemaining,
  isResending,
  disabled,
  onResend,
}: EmailVerificationResendButtonProps) {
  const t = useTranslations('EmailVerification.resend');
  const descriptionId = useId();

  return (
    <div className='flex flex-col items-start gap-2'>
      <Button
        type='button'
        variant='outline'
        disabled={disabled || isResending || secondsRemaining > 0}
        aria-busy={isResending}
        aria-describedby={descriptionId}
        onClick={onResend}
      >
        {isResending && (
          <Spinner
            aria-hidden='true'
            role='presentation'
            aria-label={undefined}
            className='motion-reduce:animate-none'
          />
        )}
        {isResending ? t('pending') : t('action')}
      </Button>
      <BodyText id={descriptionId} className='text-sm tabular-nums'>
        {secondsRemaining > 0
          ? t('cooldown', { seconds: secondsRemaining })
          : t('hint')}
      </BodyText>
    </div>
  );
}
