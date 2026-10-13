'use client';

import { useId } from 'react';
import { Controller, type FieldValues } from 'react-hook-form';

import { Field, FieldError, FieldLabel, Input } from '@/components/ui';

import { BaseFormFieldProps } from './types';

export function FormFileField<T extends FieldValues>({
  control,
  name,
  label,
}: BaseFormFieldProps<T>) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>

          <Input
            id={id}
            type='file'
            accept='.pdf,application/pdf'
            aria-label={label}
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.error ? errorId : undefined}
            onChange={(event) => {
              field.onChange(event.target.files?.[0]);
            }}
            onBlur={field.onBlur}
          />

          {fieldState.error && (
            <FieldError id={errorId} errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  );
}
