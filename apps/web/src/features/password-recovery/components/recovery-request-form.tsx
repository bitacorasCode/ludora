'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { type ReactNode, useId, useState } from 'react';
import { useForm } from 'react-hook-form';

import { FeedbackAlert } from '@/components/feedback';
import { FormTextField } from '@/components/forms';
import { Button, FieldGroup } from '@/components/ui';
import {
  createRecoveryRequestSchema,
  type RecoveryRequestFormData,
} from '@/lib/schemas';

type RecoveryRequestFormProps = {
  id?: string;
  feedbackAction?: ReactNode;
};

export function RecoveryRequestForm({
  id,
  feedbackAction,
}: RecoveryRequestFormProps) {
  const t = useTranslations('PasswordRecovery');
  const validation = useTranslations('PasswordRecovery.validation');
  const [submitted, setSubmitted] = useState(false);
  const generatedId = useId();
  const form = useForm<RecoveryRequestFormData>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(createRecoveryRequestSchema((key) => validation(key))),
    defaultValues: { email: '' },
  });

  return (
    <form
      id={id ?? generatedId}
      aria-label={t('request.title')}
      tabIndex={-1}
      onSubmit={form.handleSubmit(() => setSubmitted(true))}
      onChange={() => setSubmitted(false)}
      noValidate
    >
      {submitted && (
        <div>
          <FeedbackAlert
            status='warning'
            title={t('request.feedbackTitle')}
            message={t('request.feedbackMessage')}
          />
          {feedbackAction}
        </div>
      )}
      <FieldGroup>
        <FormTextField
          control={form.control}
          name='email'
          inputType='email'
          autoComplete='email'
          label={t('email')}
          placeholder={t('emailPlaceholder')}
        />
        <div className='flex justify-end'>
          <Button type='submit' disabled={form.formState.isSubmitting}>
            {t('request.submit')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
