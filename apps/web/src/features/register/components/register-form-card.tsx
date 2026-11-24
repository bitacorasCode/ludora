'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { FormPageCard, FormPageSkeleton } from '@/components/forms';
import { Skeleton } from '@/components/ui';

import { REGISTER_FORM_ID, userFields } from '../config';

export function RegisterFormCard({ children }: { children: ReactNode }) {
  const t = useTranslations('Register');

  return (
    <FormPageCard
      formId={REGISTER_FORM_ID}
      skipToForm={t('skipToForm')}
      title={t('title')}
      description={t('description')}
      contentClassName='relative min-h-[46.25rem] min-[24rem]:min-h-[45rem] sm:min-h-[42.25rem]'
    >
      {children}
    </FormPageCard>
  );
}

export function RegisterFormSkeleton() {
  const beforeFields = (
    <div className='mb-4 space-y-2'>
      <Skeleton className='mb-3 h-5 w-36' />
      <Skeleton className='h-3' />
      <Skeleton className='h-3 w-5/6' />
      <Skeleton className='h-3 w-2/3' />
    </div>
  );

  const afterFields = (
    <div className='mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'>
      <Skeleton className='h-9 rounded-lg sm:w-52' />
      <div className='flex h-9 items-center self-center'>
        <Skeleton className='h-3 w-36' />
      </div>
    </div>
  );

  return (
    <RegisterFormCard>
      <FormPageSkeleton
        formId={REGISTER_FORM_ID}
        fields={userFields.length}
        beforeFields={beforeFields}
        afterFields={afterFields}
      />
    </RegisterFormCard>
  );
}
