'use client';

import { useTranslations } from 'next-intl';

import { FeedbackAlert } from '@/components/feedback';
import { FormPageCard } from '@/components/forms';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

import useRegisterForm from '../hooks/use-register-form';
import RegisterFormActions from './register-form-actions';
import RegisterFormData from './register-form-data';

export function RegisterForm() {
  const { form, submissionFeedback, onSubmit } = useRegisterForm();
  const t = useTranslations('Register');

  return (
    <FormPageCard
      formId='register-form'
      skipToForm={t('skipToForm')}
      title={t('title')}
      footer={
        <>
          <Button asChild variant='link'>
            <Link href='/login'>{t('signIn')}</Link>
          </Button>
          <RegisterFormActions isSubmitting={form.formState.isSubmitting} />
        </>
      }
    >
      {submissionFeedback && (
        <FeedbackAlert
          status={submissionFeedback.status}
          title={submissionFeedback.title}
          message={submissionFeedback.message}
        />
      )}
      <form
        id='register-form'
        tabIndex={-1}
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <fieldset disabled={form.formState.isSubmitting}>
          <legend className='sr-only'>{t('accountData')}</legend>
          <RegisterFormData control={form.control} />
        </fieldset>
      </form>
    </FormPageCard>
  );
}
