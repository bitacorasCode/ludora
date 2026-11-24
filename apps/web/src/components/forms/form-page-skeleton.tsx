import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Field, FieldGroup, FieldSeparator, Skeleton } from '@/components/ui';

import { FormFieldFeedback } from './fields/form-field-feedback';

type FormPageSkeletonProps = {
  formId: string;
  fields: number;
  beforeFields?: ReactNode;
  afterFields: ReactNode;
};

export function FormPageSkeleton({
  formId,
  fields,
  beforeFields,
  afterFields,
}: FormPageSkeletonProps) {
  const t = useTranslations('Common.status');

  return (
    <div
      id={formId}
      role='status'
      tabIndex={-1}
      className='absolute inset-0 overflow-hidden px-(--card-spacing)'
    >
      <span className='sr-only'>{t('loadingForm')}</span>
      <div aria-hidden='true' className='flex h-full flex-col'>
        <div className='mb-6 space-y-6'>
          <Skeleton className='h-10 rounded-lg' />
          <FieldSeparator className='my-0 [&>span]:bg-card'>
            <Skeleton as='span' className='inline-block h-3 w-24 align-middle' />
          </FieldSeparator>
        </div>

        {beforeFields}

        <FieldGroup>
          {Array.from({ length: fields }, (_, index) => (
            <Field key={index}>
              <div className='flex h-5 items-center'>
                <Skeleton className='h-3 w-24' />
              </div>
              <Skeleton className='h-9 rounded-lg' />
              <FormFieldFeedback />
            </Field>
          ))}
        </FieldGroup>

        <div className='mt-auto'>{afterFields}</div>
      </div>
    </div>
  );
}
