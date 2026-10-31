'use client';

import { useTranslations } from 'next-intl';

import { TransitionAlert } from '@/components/feedback';
import {
  FormActions,
  FormPageCard,
  FormTextField,
  SubmitButton,
} from '@/components/forms';
import { Button, FieldGroup, FieldSet } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
import { Link } from '@/i18n/navigation';

import { LOGIN_ERROR_CODES } from '../config';
import useLoginForm from '../hooks/use-login-form';

const formId = 'login-form';

export function LoginPageContent() {
  const t = useTranslations('Login');

  const {
    form,
    onSubmit,
    hasInvalidCredentials,
    clearCredentialsError,
    isSubmitting,
  } = useLoginForm();

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
        onChange={clearCredentialsError}
        noValidate
      >
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
                <Link href={APP_ROUTES.forgotPassword}>{t('forgotPassword')}</Link>
              </Button>

              <TransitionAlert
                open={hasInvalidCredentials}
                status='error'
                title={t('feedback.errorTitle')}
                message={t(`errors.${LOGIN_ERROR_CODES.invalidCredentials}`)}
              />
            </div>

            <FormActions
              secondaryAction={
                <Button asChild variant='link'>
                  <Link href={APP_ROUTES.register}>{t('register')}</Link>
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
