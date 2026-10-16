import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

import { TextSkeleton } from './text-skeleton';

export type RowSkeletonProps = {
  descriptionLines?: number;
  withAvatar?: boolean;
  withAction?: boolean;
  size?: 'default' | 'lg';
  className?: string;
};

export function RowSkeleton({
  descriptionLines = 1,
  withAvatar = false,
  withAction = false,
  size = 'default',
  className,
}: RowSkeletonProps) {
  return (
    <div
      aria-hidden='true'
      className={cn(
        'flex w-full flex-col items-start gap-5 sm:flex-row sm:items-center',
        className,
      )}
    >
      {withAvatar && (
        <Skeleton
          className={cn(
            'size-10 shrink-0 rounded-full',
            size === 'lg' && 'size-20',
          )}
        />
      )}
      <TextSkeleton
        withTitle
        lines={descriptionLines}
        size={size}
        className='flex-1 sm:max-w-lg'
      />
      {withAction && (
        <Skeleton className='h-9 w-28 max-w-full shrink-0 sm:ml-auto sm:self-center' />
      )}
    </div>
  );
}
