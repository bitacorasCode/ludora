'use client';

import { useTranslations } from 'next-intl';

import {
  FormActions,
  FormPageCard,
  SubmitButton,
} from '@/components/forms';
import { Button, FieldSet } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
import { Link } from '@/i18n/navigation';

import useRegisterForm from '../hooks/use-register-form';
import RegisterFormData from './register-form-data';

const formId = 'register-form';

export function RegisterPageContent() {
  const {
    form,
    onSubmit,
    isSubmitting,
  } = useRegisterForm();
  const t = useTranslations('Register');

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
        noValidate
      >
        <FieldSet disabled={isSubmitting}>
          <legend className='sr-only'>{t('accountData')}</legend>
          <RegisterFormData control={form.control} />
          <FormActions
            secondaryAction={
              <Button asChild variant='link'>
                <Link href={APP_ROUTES.login}>{t('signIn')}</Link>
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
