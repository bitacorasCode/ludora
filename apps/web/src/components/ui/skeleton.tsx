import * as React from 'react';

import { cn } from '@/lib/utils';

type SkeletonProps = React.ComponentProps<'div'> & {
  as?: 'div' | 'span';
};

function Skeleton({ as: Element = 'div', className, ...props }: SkeletonProps) {
  return (
    <Element
      data-slot='skeleton'
      aria-hidden='true'
      className={cn('motion-safe:animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
