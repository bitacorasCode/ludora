'use client';

import { useId } from 'react';
import { Controller, type FieldValues } from 'react-hook-form';

import {
  Field,
  FieldError,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

import { BaseFormFieldProps } from './types';

type Option = {
  label: string;
  value: string;
};

type Props<T extends FieldValues> = BaseFormFieldProps<T> & {
  placeholder: string;
  options: Option[];
};

export function FormSelectField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
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

          <Select
            value={field.value ?? ''}
            onValueChange={field.onChange}
            onOpenChange={(open) => {
              if (!open) field.onBlur();
            }}
          >
            <SelectTrigger
              id={id}
              aria-label={label}
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.error ? errorId : undefined}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>

            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {fieldState.error && (
            <FieldError id={errorId} errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  );
}
