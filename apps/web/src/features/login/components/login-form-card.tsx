'use client';

import type { PasswordFormMode } from '@ludora/contracts/auth';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Alert } from '@/components/feedback';
import { FormPageCard, FormPageSkeleton } from '@/components/forms';
import { Skeleton } from '@/components/ui';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { LOGIN_FORM_ID } from '../config';

const LOGIN_FORM_FIELD_COUNT = 2;

export type LoginNoticeProps = {
  completedPasswordMode?: PasswordFormMode;
  sessionExpired?: boolean;
};

export function LoginFormCard({ children }: { children?: ReactNode }) {
  const t = useTranslations();

  return (
    <FormPageCard
      formId={LOGIN_FORM_ID}
      skipToForm={t('Login.skipToForm')}
      title={t('Login.title')}
      description={t('Login.verificationHint')}
      contentClassName='min-h-109 min-[24rem]:min-h-97'
    >
      {children ?? (
        <div id={LOGIN_FORM_ID} role='status' tabIndex={-1} className='text-muted-foreground'>
          {t('Common.status.loadingForm')}
        </div>
      )}
    </FormPageCard>
  );
}

export function LoginNotice({ completedPasswordMode, sessionExpired }: LoginNoticeProps) {
  const t = useTranslations();

  if (completedPasswordMode) {
    return (
      <Alert
        status='success'
        title={t(`PasswordRecovery.${completedPasswordMode}.success.title`)}
        message={t(`PasswordRecovery.${completedPasswordMode}.success.message`)}
      />
    );
  }

  if (sessionExpired) {
    return (
      <Alert
        status='warning'
        role='status'
        title={t('Login.sessionExpired.title')}
        message={t('Login.sessionExpired.message')}
      />
    );
  }

  return null;
}

export function LoginFormSkeleton(notice: LoginNoticeProps) {
  const t = useTranslations('Login');
  const actionClassName = buttonVariants({ variant: 'ghost' });
  const afterFields = (
    <>
      <div className='mt-2 flex h-9 items-center'>
        <Skeleton className='h-3 w-40' />
      </div>
      <div className='mt-2 flex flex-row-reverse flex-wrap items-center gap-3'>
        <Skeleton className={actionClassName}>
          <span className='invisible'>{t('submit')}</span>
        </Skeleton>
        <div className={cn(actionClassName, 'relative mr-auto')}>
          <span className='invisible'>{t('register')}</span>
          <Skeleton className='absolute inset-x-3 h-3' />
        </div>
      </div>
    </>
  );

  return (
    <LoginFormCard>
      {(notice.completedPasswordMode || notice.sessionExpired) && (
        <div aria-hidden='true' className='relative flow-root'>
          <div className='invisible'>
            <LoginNotice {...notice} />
          </div>
          <Skeleton className='absolute inset-x-0 top-0 bottom-4 rounded-2xl' />
        </div>
      )}
      <FormPageSkeleton
        formId={LOGIN_FORM_ID}
        fields={LOGIN_FORM_FIELD_COUNT}
        afterFields={afterFields}
      />
    </LoginFormCard>
  );
}
