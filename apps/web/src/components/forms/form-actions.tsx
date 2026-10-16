import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type FormActionsProps = ComponentProps<'div'> & {
  secondaryAction?: ReactNode;
};

export function FormActions({
  secondaryAction,
  children,
  className,
  ...props
}: FormActionsProps) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-3', className)}
      {...props}
    >
      {secondaryAction}
      <div className='ml-auto flex items-center gap-3'>{children}</div>
    </div>
  );
}
