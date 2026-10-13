'use client';

import { Controller, FieldValues } from 'react-hook-form';

import { Field, FieldError, FieldLabel, Input } from '@/components/ui';

import { BaseFormFieldProps } from './types';

export function FormFileField<T extends FieldValues>({
  control,
  name,
  label,
}: BaseFormFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{label}</FieldLabel>

          <Input
            type='file'
            accept='.pdf,application/pdf'
            aria-label={label}
            aria-invalid={fieldState.invalid}
            onChange={(event) => {
              field.onChange(event.target.files?.[0]);
            }}
            onBlur={field.onBlur}
          />

          {fieldState.error && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
