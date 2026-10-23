'use client';

import { useId } from 'react';
import { Controller, type FieldValues } from 'react-hook-form';

import { Field, FieldLabel, Input } from '@/components/ui';

import { FormFieldFeedback } from './form-field-feedback';
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
            type='number'
            value={field.value ?? ''}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.error ? errorId : undefined}
            onChange={(event) => {
              const value = event.target.value;

              field.onChange(
                value === '' ? undefined : event.target.valueAsNumber,
              );
            }}
            onBlur={field.onBlur}
          />

          <FormFieldFeedback id={errorId} errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
