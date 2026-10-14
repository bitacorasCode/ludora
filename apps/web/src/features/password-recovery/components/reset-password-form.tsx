'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FeedbackAlert } from '@/components/feedback';
import { FormPageCard, FormTextField } from '@/components/forms';
import { Button, FieldGroup } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { createPasswordResetSchema, type PasswordResetFormData } from '@/lib/schemas';

export function ResetPasswordForm() {
  const t = useTranslations('PasswordRecovery');
  const validation = useTranslations('PasswordRecovery.validation');
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<PasswordResetFormData>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(createPasswordResetSchema((key) => validation(key))),
    defaultValues: { password: '', confirmPassword: '' },
  });

  return (
    <FormPageCard
      formId='reset-password-form'
      skipToForm={t('skipToForm')}
      title={t('reset.title')}
      description={t('reset.description')}
      footer={
        <div className='flex w-full flex-wrap items-center justify-between gap-2'>
          <Button asChild variant='link'>
            <Link href='/login'>{t('backToLogin')}</Link>
          </Button>
          <Button type='submit' form='reset-password-form'>
            {t('reset.submit')}
          </Button>
        </div>
      }
    >
      {submitted && (
        <FeedbackAlert
          status='warning'
          title={t('reset.feedbackTitle')}
          message={t('reset.feedbackMessage')}
        />
      )}
      <form
        id='reset-password-form'
        tabIndex={-1}
        onSubmit={form.handleSubmit(() => setSubmitted(true))}
        onChange={() => setSubmitted(false)}
        noValidate
      >
        <FieldGroup>
          <FormTextField
            control={form.control}
            name='password'
            inputType='password'
            autoComplete='new-password'
            label={t('password')}
            placeholder={t('passwordPlaceholder')}
          />
          <FormTextField
            control={form.control}
            name='confirmPassword'
            inputType='password'
            autoComplete='new-password'
            label={t('confirmPassword')}
            placeholder={t('confirmPasswordPlaceholder')}
          />
        </FieldGroup>
      </form>
    </FormPageCard>
  );
}
