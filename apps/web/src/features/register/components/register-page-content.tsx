'use client';

import { useTranslations } from 'next-intl';

import { FeedbackAlert } from '@/components/feedback';
import { FormActions, FormPageCard, SubmitButton } from '@/components/forms';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

import useRegisterForm from '../hooks/use-register-form';
import RegisterFormData from './register-form-data';

const formId = 'register-form';

export function RegisterPageContent() {
  const { form, submissionFeedback, onSubmit } = useRegisterForm();
  const t = useTranslations('Register');

  return (
    <FormPageCard
      formId={formId}
      skipToForm={t('skipToForm')}
      title={t('title')}
    >
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
        <fieldset disabled={form.formState.isSubmitting} className='space-y-6'>
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
              isSubmitting={form.formState.isSubmitting}
              mainText={t('actions.submit')}
              submittingText={t('actions.submitting')}
            />
          </FormActions>
        </fieldset>
      </form>
    </FormPageCard>
  );
}
