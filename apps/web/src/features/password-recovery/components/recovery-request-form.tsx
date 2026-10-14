'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FeedbackAlert } from '@/components/feedback';
import { FormPageCard, FormTextField } from '@/components/forms';
import { Button, FieldGroup } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import {
  createRecoveryRequestSchema,
  type RecoveryRequestFormData,
} from '@/lib/schemas';

export function RecoveryRequestForm() {
  const t = useTranslations('PasswordRecovery');
  const validation = useTranslations('PasswordRecovery.validation');
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<RecoveryRequestFormData>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(createRecoveryRequestSchema((key) => validation(key))),
    defaultValues: { email: '' },
  });

  return (
    <FormPageCard
      formId='recovery-request-form'
      skipToForm={t('skipToForm')}
      title={t('request.title')}
      description={t('request.description')}
      footer={
        <div className='flex w-full flex-wrap items-center justify-between gap-2'>
          <Button asChild variant='link'>
            <Link href='/login'>{t('backToLogin')}</Link>
          </Button>
          <Button type='submit' form='recovery-request-form'>
            {t('request.submit')}
          </Button>
        </div>
      }
    >
      {submitted && (
        <div>
          <FeedbackAlert
            status='warning'
            title={t('request.feedbackTitle')}
            message={t('request.feedbackMessage')}
          />
          <Button asChild variant='link' className='px-0'>
            <Link href='/reset-password'>{t('request.previewReset')}</Link>
          </Button>
        </div>
      )}
      <form
        id='recovery-request-form'
        tabIndex={-1}
        onSubmit={form.handleSubmit(() => setSubmitted(true))}
        onChange={() => setSubmitted(false)}
        noValidate
      >
        <FieldGroup>
          <FormTextField
            control={form.control}
            name='email'
            inputType='email'
            autoComplete='email'
            label={t('email')}
            placeholder={t('emailPlaceholder')}
          />
        </FieldGroup>
      </form>
    </FormPageCard>
  );
}
