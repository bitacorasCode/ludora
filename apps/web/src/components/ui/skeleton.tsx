import { cn } from 'cn';
import * as React from 'react';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='skeleton'
      aria-hidden='true'
      className={cn('motion-safe:animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
