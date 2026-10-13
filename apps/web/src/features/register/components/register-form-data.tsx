'use client';

import type { Control, FieldValues, Path } from 'react-hook-form';

import { FormDateField, FormTextField } from '@/components/forms';
import { CardDescription, FieldGroup } from '@/components/ui';

import { userFields } from '../config';

type RegisterFormDataProps<T extends FieldValues> = {
  control: Control<T>;
};

export default function RegisterFormData<T extends FieldValues>({
  control,
}: RegisterFormDataProps<T>) {
  return (
    <div className='w-full'>
      <CardDescription>Datos personales</CardDescription>
      <FieldGroup className='mt-4'>
        {userFields.map((field) => {
          if (field.type === 'string') {
            return (
              <FormTextField
                key={field.name}
                control={control}
                name={field.name as Path<T>}
                label={field.label}
                placeholder={field.placeholder ?? ''}
              />
            );
          }

          if (field.type === 'date') {
            return (
              <FormDateField
                key={field.name}
                control={control}
                name={field.name as Path<T>}
                label={field.label}
                placeholder={field.placeholder ?? ''}
              />
            );
          }

          return null;
        })}
      </FieldGroup>
    </div>
  );
}
