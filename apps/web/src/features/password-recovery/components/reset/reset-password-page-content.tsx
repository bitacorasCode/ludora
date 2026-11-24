'use client';

import { AUTH_ERROR_CODES, PASSWORD_FORM_MODE, type PasswordFormMode } from '@ludora/contracts/auth';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { ErrorState } from '@/components/feedback';
import {
  FormActions,
  FormPageCard,
  FormTextField,
  SubmitButton,
} from '@/components/forms';
import { PageContainer, PageSection } from '@/components/layout';
import { PageTitle } from '@/components/typography';
import { Button, FieldGroup, FieldSet } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
import { Link } from '@/i18n/navigation';

import usePasswordResetForm from '../../hooks/use-password-reset-form';

const formId = 'reset-password-form';

type ResetPasswordPageContentProps = {
  token: string | null;
  mode: PasswordFormMode;
};

export function ResetPasswordPageContent({ token, mode }: ResetPasswordPageContentProps) {
  const t = useTranslations('PasswordRecovery');
  const action = useTranslations(
    mode === PASSWORD_FORM_MODE.create ? 'PasswordRecovery.create' : 'PasswordRecovery.reset',
  );
  const { form, onSubmit, hasInvalidLink, isSubmitting } = usePasswordResetForm(token, mode);
  const invalidLinkRegion = useRef<HTMLElement>(null);

  useEffect(() => {
    if (hasInvalidLink) {
      invalidLinkRegion.current?.focus();
    }
  }, [hasInvalidLink]);

  if (hasInvalidLink) {
    return (
      <PageContainer className='max-w-xl'>
        <PageSection
          ref={invalidLinkRegion}
          tabIndex={-1}
          aria-label={t('reset.invalidLink.title')}
        >
          <PageTitle>{t('reset.title')}</PageTitle>
          <ErrorState
            title={t('reset.invalidLink.title')}
            description={t(`errors.${AUTH_ERROR_CODES.passwordResetInvalid}`)}
            primaryAction={
              <Button asChild>
                <Link href={APP_ROUTES.forgotPassword}>{t('reset.invalidLink.requestNewLink')}</Link>
              </Button>
            }
            secondaryAction={
              <Button asChild variant='outline'>
                <Link href={APP_ROUTES.login}>{t('backToLogin')}</Link>
              </Button>
            }
          />
        </PageSection>
      </PageContainer>
    );
  }

  return (
    <FormPageCard
      formId={formId}
      skipToForm={t('skipToForm')}
      title={t('reset.title')}
      description={t('reset.description')}
    >
      <form
        id={formId}
        aria-label={t('reset.title')}
        aria-busy={isSubmitting}
        tabIndex={-1}
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <FieldSet disabled={isSubmitting}>
          <FieldGroup>
            <FormTextField
              control={form.control}
              name='password'
              inputType='password'
              autoComplete='new-password'
              label={t('fields.password.label')}
            />
            <FormTextField
              control={form.control}
              name='confirmPassword'
              inputType='password'
              autoComplete='new-password'
              label={t('fields.confirmPassword.label')}
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
                mainText={action('submit')}
                submittingText={action('submitting')}
              />
            </FormActions>
          </FieldGroup>
        </FieldSet>
      </form>
    </FormPageCard>
  );
}
