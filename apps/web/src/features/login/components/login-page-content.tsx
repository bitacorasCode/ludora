'use client';

import { useTranslations } from 'next-intl';

import { FeedbackAlert } from '@/components/feedback';
import {
  FormActions,
  FormPageCard,
  FormTextField,
  SubmitButton,
} from '@/components/forms';
import { Button, FieldGroup, FieldSet } from '@/components/ui';
import { useActionErrorMessage } from '@/hooks';
import { Link } from '@/i18n/navigation';
import { OPERATION_STATUS } from '@/lib/actions';

import useLoginForm from '../hooks/use-login-form';

const formId = 'login-form';

export function LoginPageContent() {
  const t = useTranslations('Login');
  const loginErrors = useTranslations('Login.errors');

  const {
    form,
    onSubmit,
    clearSubmission,
    submissionError,
    isSuccess,
    isSubmitting,
  } = useLoginForm();

  const errorMessage = useActionErrorMessage(submissionError, loginErrors);

  return (
    <FormPageCard
      formId={formId}
      skipToForm={t('skipToForm')}
      title={t('title')}
      description={t('description')}
    >
      <form
        id={formId}
        aria-label={t('title')}
        aria-busy={isSubmitting}
        tabIndex={-1}
        onSubmit={form.handleSubmit(onSubmit)}
        onChange={clearSubmission}
        noValidate
      >
        {errorMessage && (
          <FeedbackAlert
            status={OPERATION_STATUS.error}
            title={t('feedback.errorTitle')}
            message={errorMessage}
          />
        )}

        {isSuccess && (
          <FeedbackAlert
            status={OPERATION_STATUS.success}
            title={t('feedback.successTitle')}
            message={t('feedback.successMessage')}
          />
        )}

        <FieldSet disabled={isSubmitting}>
          <FieldGroup>
            <FormTextField
              control={form.control}
              name='email'
              inputType='email'
              autoComplete='email'
              label={t('email')}
              placeholder={t('emailPlaceholder')}
            />

            <div>
              <FormTextField
                control={form.control}
                name='password'
                inputType='password'
                autoComplete='current-password'
                label={t('password')}
                placeholder={t('passwordPlaceholder')}
              />

              <Button asChild variant='link' className='mt-2 px-0'>
                <Link href='/forgot-password'>{t('forgotPassword')}</Link>
              </Button>
            </div>

            <FormActions
              secondaryAction={
                <Button asChild variant='link'>
                  <Link href='/register'>{t('register')}</Link>
                </Button>
              }
            >
              <SubmitButton
                isSubmitting={isSubmitting}
                mainText={t('submit')}
                submittingText={t('submitting')}
              />
            </FormActions>
          </FieldGroup>
        </FieldSet>
      </form>
    </FormPageCard>
  );
}
