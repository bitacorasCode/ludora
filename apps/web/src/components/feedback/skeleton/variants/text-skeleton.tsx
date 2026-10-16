import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

type TextSkeletonProps = {
  lines?: number;
  withTitle?: boolean;
  size?: 'default' | 'lg';
  className?: string;
};

export function TextSkeleton({
  lines = 1,
  withTitle = false,
  size = 'default',
  className,
}: TextSkeletonProps) {
  const lineCount = Number.isFinite(lines) ? Math.max(0, Math.floor(lines)) : 0;

  return (
    <div
      aria-hidden='true'
      className={cn('w-full min-w-0 space-y-3', className)}
    >
      {withTitle && (
        <Skeleton
          className={cn('h-5 w-32 max-w-full', size === 'lg' && 'h-8 w-40')}
        />
      )}
      {Array.from({ length: lineCount }, (_, index) => (
        <Skeleton
          key={index}
          className={cn(
            'h-4 w-full',
            size === 'lg' && 'h-5',
            lineCount > 1 && index === lineCount - 1 && 'w-3/4',
          )}
        />
      ))}
    </div>
  );
}
