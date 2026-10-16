import type { ComponentProps } from 'react';

import { Button, Spinner } from '@/components/ui';

type SubmitButtonProps = Omit<
  ComponentProps<typeof Button>,
  'asChild' | 'type' | 'children'
> & {
  mainText: string;
  submittingText: string;
  isSubmitting: boolean;
};

export function SubmitButton({
  mainText,
  submittingText,
  isSubmitting,
  disabled = false,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      {...props}
      type='submit'
      disabled={disabled || isSubmitting}
      aria-busy={isSubmitting}
    >
      {isSubmitting && (
        <Spinner
          aria-hidden='true'
          role='presentation'
          aria-label={undefined}
          className='motion-reduce:animate-none'
        />
      )}
      {isSubmitting ? submittingText : mainText}
    </Button>
  );
}
