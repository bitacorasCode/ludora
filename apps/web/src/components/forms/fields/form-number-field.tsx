'use client';

import { Controller, FieldValues } from 'react-hook-form';

import { Field, FieldError, FieldLabel, Input } from '@/components/ui';

import { BaseFormFieldProps } from './types';

type Props<T extends FieldValues> = BaseFormFieldProps<T> & {
  placeholder?: string;
};

export function FormNumberField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
}: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{label}</FieldLabel>

          <Input
            type='number'
            value={field.value ?? ''}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
            onChange={(event) => {
              const value = event.target.value;

              field.onChange(
                value === '' ? undefined : event.target.valueAsNumber,
              );
            }}
            onBlur={field.onBlur}
          />

          {fieldState.error && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
