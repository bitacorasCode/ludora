'use client';

import { AUTH_ERROR_CODES } from '@ludora/security';
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
};

export function ResetPasswordPageContent({ token }: ResetPasswordPageContentProps) {
  const t = useTranslations('PasswordRecovery');
  const { form, onSubmit, hasInvalidLink, isSubmitting } = usePasswordResetForm(token);
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
          aria-label={t('reset.invalidLinkTitle')}
        >
          <PageTitle>{t('reset.title')}</PageTitle>
          <ErrorState
            title={t('reset.invalidLinkTitle')}
            description={t(`errors.${AUTH_ERROR_CODES.passwordResetInvalid}`)}
            primaryAction={
              <Button asChild>
                <Link href={APP_ROUTES.forgotPassword}>{t('reset.requestNewLink')}</Link>
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
            <FormActions
              secondaryAction={
                <Button asChild variant='link'>
                  <Link href={APP_ROUTES.login}>{t('backToLogin')}</Link>
                </Button>
              }
            >
              <SubmitButton
                isSubmitting={isSubmitting}
                mainText={t('reset.submit')}
                submittingText={t('reset.submitting')}
              />
            </FormActions>
          </FieldGroup>
        </FieldSet>
      </form>
    </FormPageCard>
  );
}
