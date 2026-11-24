'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { FormPageCard, FormPageSkeleton } from '@/components/forms';
import { Skeleton } from '@/components/ui';

import { LOGIN_FORM_ID } from '../config';

const LOGIN_FORM_FIELD_COUNT = 2;

export function LoginFormCard({ children }: { children: ReactNode }) {
  const t = useTranslations('Login');

  return (
    <FormPageCard
      formId={LOGIN_FORM_ID}
      skipToForm={t('skipToForm')}
      title={t('title')}
      description={t('verificationHint')}
      contentClassName='relative min-h-109 min-[24rem]:min-h-97'
    >
      {children}
    </FormPageCard>
  );
}

export function LoginFormSkeleton() {
  const afterFields = (
    <>
      <div className='mt-2 flex h-9 items-center'>
        <Skeleton className='h-3 w-40' />
      </div>
      <div className='mt-2 flex flex-row-reverse flex-wrap items-center gap-3'>
        <Skeleton className='h-9 w-28 rounded-lg' />
        <div className='mr-auto flex h-9 items-center'>
          <Skeleton className='h-3 w-32' />
        </div>
      </div>
    </>
  );

  return (
    <LoginFormCard>
      <FormPageSkeleton
        formId={LOGIN_FORM_ID}
        fields={LOGIN_FORM_FIELD_COUNT}
        afterFields={afterFields}
      />
    </LoginFormCard>
  );
}
