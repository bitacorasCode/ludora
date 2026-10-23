import type { ComponentProps } from 'react';

import { FieldError } from '@/components/ui';

export function FormFieldFeedback({
  id,
  errors,
}: Pick<ComponentProps<typeof FieldError>, 'id' | 'errors'>) {
  return (
    <div data-slot='form-field-feedback' className='-mt-2 min-h-5'>
      <FieldError id={id} errors={errors} />
    </div>
  );
}
