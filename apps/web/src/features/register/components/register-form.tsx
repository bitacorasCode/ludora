'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { FeedbackAlert } from '@/components/feedback';

import useRegisterForm from '../hooks/use-register-form';
import RegisterFormActions from './register-form-actions';
import RegisterFormData from './register-form-data';

type RegisterFormProps = {
  id?: string;
};

export function RegisterForm({ id }: RegisterFormProps) {
  const { form, submissionFeedback, onSubmit } = useRegisterForm();
  const t = useTranslations('Register');
  const generatedId = useId();
  const formId = id ?? generatedId;

  return (
    <form
      id={formId}
      aria-label={t('title')}
      tabIndex={-1}
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      {submissionFeedback && (
        <FeedbackAlert
          status={submissionFeedback.status}
          title={submissionFeedback.title}
          message={submissionFeedback.message}
        />
      )}
      <fieldset
        disabled={form.formState.isSubmitting}
        className='space-y-6'
      >
        <legend className='sr-only'>{t('accountData')}</legend>
        <RegisterFormData control={form.control} />
        <RegisterFormActions
          formId={formId}
          isSubmitting={form.formState.isSubmitting}
        />
      </fieldset>
    </form>
  );
}
