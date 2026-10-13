'use client';

import { Button, Field, Spinner } from '@/components/ui';

type RegisterFormActionsProps = {
  formId?: string;
  isSubmitting: boolean;
  disabled: boolean;
};

export default function RegisterFormActions({
  formId = 'register-form',
  isSubmitting,
  disabled,
}: RegisterFormActionsProps) {
  return (
    <Field orientation='horizontal' className='flex w-full justify-end'>
      <Button disabled={disabled} type='submit' form={formId}>
        {isSubmitting && <Spinner />}
        {isSubmitting ? 'Guardando...' : 'Guardar'}
      </Button>
    </Field>
  );
}
