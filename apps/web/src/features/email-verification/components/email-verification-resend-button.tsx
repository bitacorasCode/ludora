'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef } from 'react';

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
  const statusRef = useRef<HTMLSpanElement>(null);
  const announceWhenReady = useRef(false);
  const isCoolingDown = secondsRemaining > 0;
  const isDisabled = disabled || isResending || isCoolingDown;
  const availableMessage = t('available');

  useEffect(() => {
    const status = statusRef.current;
    if (!status) return;

    if (isCoolingDown) announceWhenReady.current = true;

    if (isDisabled) {
      status.textContent = '';
    } else if (announceWhenReady.current) {
      announceWhenReady.current = false;
      status.textContent = availableMessage;
    }
  }, [availableMessage, isCoolingDown, isDisabled]);

  return (
    <div className='flex flex-col items-start gap-2'>
      <Button
        type='button'
        variant='outline'
        disabled={isDisabled}
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
        {isCoolingDown
          ? t('cooldown', { seconds: secondsRemaining })
          : t('hint')}
      </BodyText>
      <span ref={statusRef} role='status' aria-atomic='true' className='sr-only' />
    </div>
  );
}
