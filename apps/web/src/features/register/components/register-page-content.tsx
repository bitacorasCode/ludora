'use client';

import { useTranslations } from 'next-intl';

import { FeedbackAlert } from '@/components/feedback';
import { FormActions, FormPageCard, SubmitButton } from '@/components/forms';
import { Button, FieldSet } from '@/components/ui';
import { useActionErrorMessage } from '@/hooks';
import { Link } from '@/i18n/navigation';
import { OPERATION_STATUS } from '@/lib/actions';

import useRegisterForm from '../hooks/use-register-form';
import RegisterFormData from './register-form-data';

const formId = 'register-form';

export function RegisterPageContent() {
  const {
    form,
    onSubmit,
    clearSubmission,
    submissionError,
    isSubmitting,
  } = useRegisterForm();
  const t = useTranslations('Register');
  const registerErrors = useTranslations('Register.errors');
  const errorMessage = useActionErrorMessage(submissionError, registerErrors);

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
        <FieldSet disabled={isSubmitting}>
          <legend className='sr-only'>{t('accountData')}</legend>
          <RegisterFormData control={form.control} />
          <FormActions
            secondaryAction={
              <Button asChild variant='link'>
                <Link href='/login'>{t('signIn')}</Link>
              </Button>
            }
          >
            <SubmitButton
              isSubmitting={isSubmitting}
              mainText={t('submit')}
              submittingText={t('submitting')}
            />
          </FormActions>
        </FieldSet>
      </form>
    </FormPageCard>
  );
}
