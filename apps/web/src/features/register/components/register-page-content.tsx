'use client';

import { useTranslations } from 'next-intl';

import { FormPageCard, SubmitButton } from '@/components/forms';
import { Button, FieldLegend, FieldSet } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
import { SocialAuthOptions } from '@/features/social-auth/components/social-auth-options';
import { Link } from '@/i18n/navigation';

import useRegisterForm from '../hooks/use-register-form';
import RegisterFormData from './register-form-data';

const formId = 'register-form';

export function RegisterPageContent() {
  const { form, onSubmit, isSubmitting } = useRegisterForm();
  const t = useTranslations('Register');

  return (
    <FormPageCard
      formId={formId}
      skipToForm={t('skipToForm')}
      title={t('title')}
      description={t('description')}
    >
      <SocialAuthOptions disabled={isSubmitting} />
      <form
        id={formId}
        aria-label={t('title')}
        aria-busy={isSubmitting}
        tabIndex={-1}
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <FieldSet disabled={isSubmitting}>
          <FieldLegend>{t('emailRegistration')}</FieldLegend>
          <RegisterFormData control={form.control} />
          <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'>
            <SubmitButton
              isSubmitting={isSubmitting}
              mainText={t('createAccountWithEmail')}
              submittingText={t('submitting')}
            />
            <Button asChild variant='link' className='self-center'>
              <Link href={APP_ROUTES.login}>{t('signIn')}</Link>
            </Button>
          </div>
        </FieldSet>
      </form>
    </FormPageCard>
  );
}
