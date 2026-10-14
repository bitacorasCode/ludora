'use client';

import { useTranslations } from 'next-intl';

import { Button, Field, Spinner } from '@/components/ui';

type RegisterFormActionsProps = {
  formId?: string;
  isSubmitting: boolean;
};

export default function RegisterFormActions({
  formId = 'register-form',
  isSubmitting,
}: RegisterFormActionsProps) {
  const t = useTranslations('Register');

  return (
    <Field orientation='horizontal' className='ml-auto flex w-auto justify-end'>
      <Button disabled={isSubmitting} type='submit' form={formId}>
        {isSubmitting && <Spinner />}
        {isSubmitting ? t('actions.submitting') : t('actions.submit')}
      </Button>
    </Field>
  );
}
