'use client';

import type { PasswordFormMode } from '@ludora/security';
import { useTranslations } from 'next-intl';

import { TransitionAlert } from '@/components/feedback';
import { FormTextField, SubmitButton } from '@/components/forms';
import { Button, FieldGroup, FieldSet } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
import { SocialAuthOptions } from '@/features/social-auth/components/social-auth-options';
import { Link } from '@/i18n/navigation';
import type { ActionError } from '@/lib/actions';

import { LOGIN_ERROR_CODES, LOGIN_FORM_ID } from '../config';
import useLoginForm from '../hooks/use-login-form';
import { LoginFormCard, PasswordCompletionNotice } from './login-form-card';

export function LoginPageContent({
  socialAuthError,
  completedPasswordMode,
}: {
  socialAuthError?: ActionError;
  completedPasswordMode?: PasswordFormMode;
}) {
  const t = useTranslations('Login');

  const {
    form,
    onSubmit,
    hasInvalidCredentials,
    clearCredentialsError,
    isSubmitting,
  } = useLoginForm();

  return (
    <LoginFormCard>
      {completedPasswordMode && (
        <PasswordCompletionNotice mode={completedPasswordMode} />
      )}
      <SocialAuthOptions
        disabled={isSubmitting}
        callbackError={socialAuthError}
      />
      <form
        id={LOGIN_FORM_ID}
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
              label={t('fields.email.label')}
              placeholder={t('fields.email.placeholder')}
            />

            <div>
              <FormTextField
                control={form.control}
                name='password'
                inputType='password'
                autoComplete='current-password'
                label={t('fields.password.label')}
                placeholder={t('fields.password.placeholder')}
              />

              <Button asChild variant='link' className='mt-2 px-0'>
                <Link href={APP_ROUTES.forgotPassword}>
                  {t('forgotPassword')}
                </Link>
              </Button>

              <TransitionAlert
                open={hasInvalidCredentials}
                status='error'
                title={t('feedback.errorTitle')}
                message={t(`errors.${LOGIN_ERROR_CODES.invalidCredentials}`)}
              />
            </div>

            <div className='flex flex-row-reverse flex-wrap items-center gap-3'>
              <SubmitButton
                isSubmitting={isSubmitting}
                mainText={t('submit')}
                submittingText={t('submitting')}
              />
              <Button asChild variant='link' className='mr-auto'>
                <Link href={APP_ROUTES.register}>{t('register')}</Link>
              </Button>
            </div>
          </FieldGroup>
        </FieldSet>
      </form>
    </LoginFormCard>
  );
}
