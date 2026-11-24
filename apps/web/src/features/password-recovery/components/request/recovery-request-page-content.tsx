'use client';

import { useTranslations } from 'next-intl';

import { Alert } from '@/components/feedback';
import {
  FormPageCard,
  FormTextField,
  SubmitButton,
} from '@/components/forms';
import { Button, FieldGroup, FieldSet } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
import { Link } from '@/i18n/navigation';

import useRecoveryRequestForm from '../../hooks/use-recovery-request-form';

const formId = 'recovery-request-form';

export function RecoveryRequestPageContent() {
  const t = useTranslations('PasswordRecovery');
  const { form, onSubmit, clearConfirmation, isRequestAccepted, isSubmitting } =
    useRecoveryRequestForm();

  return (
    <FormPageCard
      formId={formId}
      skipToForm={t('skipToForm')}
      title={t('request.title')}
      description={t('request.description')}
    >
      <form
        id={formId}
        aria-label={t('request.title')}
        aria-busy={isSubmitting}
        tabIndex={-1}
        onSubmit={form.handleSubmit(onSubmit)}
        onChange={clearConfirmation}
        noValidate
      >
        <FieldSet disabled={isSubmitting}>
          <FieldGroup>
            <FormTextField
              control={form.control}
              name='email'
              inputType='email'
              autoComplete='email'
              label={t('fields.email.label')}
              placeholder={t('fields.email.placeholder')}
            />
            <div className='flex flex-row-reverse flex-wrap items-center gap-3'>
              <SubmitButton
                isSubmitting={isSubmitting}
                mainText={t('request.submit')}
                submittingText={t('request.submitting')}
              />
              <Button asChild variant='link' className='mr-auto'>
                <Link href={APP_ROUTES.login}>{t('backToLogin')}</Link>
              </Button>
            </div>
          </FieldGroup>
        </FieldSet>
      </form>
      <div className={isRequestAccepted ? 'mt-4 [&>[data-slot=alert]]:mb-0' : 'sr-only'}>
        <Alert
          status='success'
          title={isRequestAccepted ? t('request.success.title') : undefined}
          message={isRequestAccepted ? t('request.success.message') : ''}
        />
      </div>
    </FormPageCard>
  );
}
