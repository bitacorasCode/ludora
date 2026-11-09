'use client';

import { useTranslations } from 'next-intl';

import {
  FormActions,
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
  const { form, onSubmit, isSubmitting } = useRecoveryRequestForm();

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
            <FormActions
              secondaryAction={
                <Button asChild variant='link'>
                  <Link href={APP_ROUTES.login}>{t('backToLogin')}</Link>
                </Button>
              }
            >
              <SubmitButton
                isSubmitting={isSubmitting}
                mainText={t('request.submit')}
                submittingText={t('request.submitting')}
              />
            </FormActions>
          </FieldGroup>
        </FieldSet>
      </form>
    </FormPageCard>
  );
}
