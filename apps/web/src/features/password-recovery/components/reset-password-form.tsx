'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';

import { FeedbackAlert } from '@/components/feedback';
import { FormTextField } from '@/components/forms';
import { Button, FieldGroup } from '@/components/ui';
import { createPasswordResetSchema, type PasswordResetFormData } from '@/lib/schemas';

type ResetPasswordFormProps = {
  id?: string;
};

export function ResetPasswordForm({ id }: ResetPasswordFormProps) {
  const t = useTranslations('PasswordRecovery');
  const validation = useTranslations('PasswordRecovery.validation');
  const [submitted, setSubmitted] = useState(false);
  const generatedId = useId();
  const form = useForm<PasswordResetFormData>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(createPasswordResetSchema((key) => validation(key))),
    defaultValues: { password: '', confirmPassword: '' },
  });

  return (
    <form
      id={id ?? generatedId}
      aria-label={t('reset.title')}
      tabIndex={-1}
      onSubmit={form.handleSubmit(() => setSubmitted(true))}
      onChange={() => setSubmitted(false)}
      noValidate
    >
      {submitted && (
        <FeedbackAlert
          status='warning'
          title={t('reset.feedbackTitle')}
          message={t('reset.feedbackMessage')}
        />
      )}
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
        <div className='flex justify-end'>
          <Button type='submit' disabled={form.formState.isSubmitting}>
            {t('reset.submit')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
